import Combine
import ClerkKit
import ConvexMobile
import Foundation

/// Flexible decodable that accepts any JSON value, used to discard mutation results.
private struct DiscardedResult: Decodable {
    init(from decoder: Decoder) throws {
        // Accept anything — we don't use the value
        _ = try? decoder.singleValueContainer()
    }
}

/// Application-wide singleton that owns the authenticated Convex client.
///
/// Other layers (repositories, view models) access Convex through this service
/// rather than creating their own client instances. The service automatically
/// attempts to restore a cached Clerk session on initialization.
@MainActor
final class ConvexService: ObservableObject {

    // MARK: - Singleton

    static let shared = ConvexService()

    // MARK: - Published State

    @Published private(set) var authState: AuthState<String> = .loading
    @Published private(set) var resetID = UUID()
    @Published private(set) var isResetting = false
    @Published private(set) var isWebSocketConnected: Bool = false

    // MARK: - Client

    private var client: ConvexClientWithAuth<String>

    // MARK: - Private

    private let logger = AppLogger(category: "ConvexService")
    private let networkMonitor = NetworkMonitor.shared
    private var authStateCancellable: AnyCancellable?
    private var webSocketStateCancellable: AnyCancellable?
    private var tokenRefreshTask: Task<Void, Never>?
    private var webSocketRecoveryTask: Task<Void, Never>?
    private var reconnectNotificationTask: Task<Void, Never>?
    private var lastBackgroundedAt: Date?
    private var lastResetAt = Date.distantPast
    private var wasWebSocketConnected = false

    /// Flap detection: tracks recent connect→disconnect transitions.
    /// When the WebSocket rapidly cycles (e.g., after long background periods),
    /// the recovery watchdog never fires because the WS keeps briefly connecting.
    /// This counter detects the pattern and triggers a full session reset.
    private var flapTimestamps: [Date] = []
    private static let flapThreshold = 5          // number of disconnect events
    private static let flapWindowSeconds: TimeInterval = 30  // within this time window
    /// Keeps the previous Convex client alive while its subscriptions are being
    /// cancelled during a session reset. Without this, the old client can be
    /// deallocated before subscription cancellation completes, causing a UniFFI
    /// panic in the ConvexMobile Rust layer (CHAPTERCHECK-IOS-9).
    private var retiredClient: ConvexClientWithAuth<String>?
    /// Keeps the previous client's state-observation cancellables alive alongside
    /// `retiredClient`. Cancelling these during an active WebSocket flap storm
    /// propagates into the ConvexMobile Rust layer while it's unstable, triggering
    /// the UniFFI panic. By deferring cancellation until the retired client is
    /// released (after the flap storm has settled), the Rust layer is stable again.
    private var retiredCancellables: [AnyCancellable] = []
    /// Monotonic generation counter — incremented each time `bindClientState()`
    /// creates new sinks so that stale sinks from a retired client are ignored.
    private var bindGeneration: UInt64 = 0

    /// Interval between proactive token refreshes (in seconds).
    /// Clerk JWTs expire after ~60s; refresh every 50s to stay ahead.
    private static let tokenRefreshInterval: UInt64 = 50
    private static let resetCooldownSeconds: TimeInterval = 5

    /// True when network reachability, WebSocket, and auth are all healthy.
    var isFullyConnected: Bool {
        networkMonitor.isConnected && isWebSocketConnected && isAuthenticated
    }

    private var isAuthenticated: Bool {
        if case .authenticated = authState { return true }
        return false
    }

    // MARK: - Init

    private init() {
        client = Self.makeClient()
        bindClientState()
    }

    /// Start or stop the token refresh timer based on auth state.
    /// Always cancels existing task first to avoid concurrent refreshes.
    private func handleAuthStateChange(_ state: AuthState<String>) {
        tokenRefreshTask?.cancel()
        tokenRefreshTask = nil

        switch state {
        case .authenticated(let token):
            logger.info("Auth state: authenticated (token length: \(token.count))")
            startTokenRefresh()
        case .unauthenticated:
            logger.info("Auth state: unauthenticated")
        case .loading:
            logger.info("Auth state: loading")
        }
    }

    private static func makeClient() -> ConvexClientWithAuth<String> {
        let provider = ClerkConvexAuthProvider()
        return ConvexClientWithAuth(
            deploymentUrl: AppEnvironment.convexUrl,
            authProvider: provider
        )
    }

    private func bindClientState() {
        bindGeneration &+= 1
        let expectedGeneration = bindGeneration

        authStateCancellable?.cancel()
        authStateCancellable = client.authState
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                guard let self, self.bindGeneration == expectedGeneration else { return }
                self.authState = state
                self.handleAuthStateChange(state)
            }

        webSocketStateCancellable?.cancel()
        webSocketStateCancellable = client.watchWebSocketState()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                guard let self, self.bindGeneration == expectedGeneration else { return }
                self.handleWebSocketStateChange(state)
            }
    }

    private func handleWebSocketStateChange(_ state: WebSocketState) {
        let wasConnected = wasWebSocketConnected
        let nowConnected = (state == .connected)
        isWebSocketConnected = nowConnected
        wasWebSocketConnected = nowConnected

        if !wasConnected && nowConnected {
            logger.info("WebSocket connected")
            webSocketRecoveryTask?.cancel()
            webSocketRecoveryTask = nil
            SentryService.addBreadcrumb(message: "Convex WebSocket connected", category: "convex")

            // Debounce the reconnected notification: only fire after the connection
            // has been stable for 2 seconds. This prevents a feedback loop where
            // handlers (e.g. refreshDownloadedBookMetadata) create new subscriptions
            // that cause the WebSocket to restart during its initial sync phase.
            reconnectNotificationTask?.cancel()
            reconnectNotificationTask = Task { [weak self] in
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                guard !Task.isCancelled, let self, self.isWebSocketConnected else { return }
                self.logger.info("WebSocket stable — posting reconnected notification")
                self.flapTimestamps.removeAll()
                NotificationCenter.default.post(name: .convexReconnected, object: nil)
            }
        } else if wasConnected && !nowConnected {
            let hadPendingStableNotification = reconnectNotificationTask != nil
            logger.info("WebSocket disconnected (state: \(String(describing: state)))\(hadPendingStableNotification ? " — cancelled pending stable notification" : "")")
            reconnectNotificationTask?.cancel()
            reconnectNotificationTask = nil
            SentryService.addBreadcrumb(
                message: "Convex WebSocket disconnected",
                category: "convex",
                level: .warning,
                data: ["state": String(describing: state)]
            )

            // Track this disconnect for flap detection
            let now = Date()
            flapTimestamps.append(now)
            flapTimestamps.removeAll { now.timeIntervalSince($0) > Self.flapWindowSeconds }
            logger.debug("WebSocket flap count: \(self.flapTimestamps.count)/\(Self.flapThreshold) in \(Self.flapWindowSeconds)s window")

            if flapTimestamps.count >= Self.flapThreshold {
                let count = flapTimestamps.count
                logger.warning("WebSocket flapping detected (\(count) disconnects in \(Self.flapWindowSeconds)s) — resetting session")
                SentryService.addBreadcrumb(
                    message: "WebSocket flapping detected — triggering session reset",
                    category: "convex",
                    level: .warning,
                    data: ["flapCount": String(count), "windowSeconds": String(Self.flapWindowSeconds)]
                )
                // Don't clear flapTimestamps here — resetApplicationSession will clear
                // them. If the reset is skipped (cooldown/already resetting), keeping
                // the timestamps means the next disconnect immediately re-triggers
                // instead of needing 5 more disconnects to detect the same flap storm.
                Task { [weak self] in
                    await self?.resetApplicationSession(reason: "websocket_flapping")
                }
                return
            }

            // Only start the recovery watchdog if we're not in an active flap pattern.
            // During flapping the WS keeps briefly connecting (resetting the watchdog),
            // so it never fires anyway — skip it to avoid redundant tasks.
            if flapTimestamps.count < 2 {
                startWebSocketRecoveryWatchdog()
            }
        }
    }

    /// If WebSocket stays in `.connecting` for >5s while we have network,
    /// nudge reconnection with `loginFromCache()`.
    private func startWebSocketRecoveryWatchdog() {
        webSocketRecoveryTask?.cancel()
        webSocketRecoveryTask = Task { [weak self] in
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            guard !Task.isCancelled, let self else { return }
            guard self.networkMonitor.isConnected, !self.isWebSocketConnected else { return }
            self.logger.info("WebSocket stuck connecting — nudging with loginFromCache()")
            _ = await self.client.loginFromCache()
        }
    }

    private func isAuthError(_ error: Error) -> Bool {
        let message = error.localizedDescription.lowercased()
        return message.contains("not authenticated") || message.contains("unauthenticated")
    }

    private func handleClientError(_ error: Error, context: String) {
        guard isAuthError(error) else { return }
        logger.error("Auth error in \(context): \(error.localizedDescription)")

        SentryService.addBreadcrumb(
            message: "Convex auth error in \(context)",
            category: "convex",
            level: .warning,
            data: ["context": context, "error": error.localizedDescription]
        )

        guard networkMonitor.isConnected, Clerk.shared.session != nil else { return }

        Task { [weak self] in
            await self?.resetApplicationSession(reason: "auth_error:\(context)")
        }
    }

    /// Periodically calls `loginFromCache()` on the Convex client to refresh
    /// the Clerk JWT before it expires. This keeps the Convex WebSocket
    /// authenticated without requiring user interaction.
    private func startTokenRefresh() {
        tokenRefreshTask?.cancel()
        tokenRefreshTask = Task { [weak self] in
            while !Task.isCancelled {
                do {
                    try await Task.sleep(nanoseconds: Self.tokenRefreshInterval * 1_000_000_000)
                    guard !Task.isCancelled, let self else { break }
                    _ = await self.client.loginFromCache()
                } catch {
                    break
                }
            }
        }
    }

    // MARK: - Auth Lifecycle

    /// Attempt to restore a previously authenticated Clerk session.
    /// Call this once after Clerk reports `isLoaded == true` and a session exists.
    func restoreSession() async {
        _ = await client.loginFromCache()
    }

    func appDidEnterBackground() {
        lastBackgroundedAt = Date()
    }

    func appDidBecomeActive() async {
        let backgroundDuration = lastBackgroundedAt.map { Date().timeIntervalSince($0) } ?? 0
        lastBackgroundedAt = nil

        guard networkMonitor.isConnected else {
            logger.info("App became active after \(Int(backgroundDuration))s in background — no network, skipping recovery")
            return
        }

        // No Clerk session means the user is signed out or mid sign-in (e.g. on
        // the OTP entry screen). There's no authenticated session to refresh and
        // no authenticated WebSocket to wait for — running the recovery logic
        // below would fall through to `resetApplicationSession`, which bumps
        // `resetID` and destroys the SwiftUI tree (including the lifted
        // `pendingSignIn` state that keeps the user on the code entry screen).
        guard Clerk.shared.session != nil else {
            logger.info("App became active after \(Int(backgroundDuration))s in background — no Clerk session, skipping recovery")
            return
        }

        logger.info("App became active after \(Int(backgroundDuration))s in background")

        if case .authenticated = authState {
            await refreshTokenNow()
        } else {
            logger.info("Restoring Convex session after foreground resume")
            _ = await client.loginFromCache()
        }

        // Wait up to 3s for WebSocket to reconnect after foregrounding.
        // If still not connected, retry once. If still stuck, full reset.
        if !isWebSocketConnected {
            logger.info("WebSocket not connected after foreground resume — waiting up to 3s")
            let connected = await waitForWebSocket(timeout: 3)
            if !connected {
                logger.info("WebSocket still not connected — retrying loginFromCache")
                _ = await client.loginFromCache()
                let retryConnected = await waitForWebSocket(timeout: 3)
                if !retryConnected {
                    logger.warning("WebSocket recovery failed — resetting session")
                    await resetApplicationSession(reason: "websocket_stuck_after_foreground")
                }
            }
        }
    }

    /// Wait for `isWebSocketConnected` to become true within a timeout.
    private func waitForWebSocket(timeout: TimeInterval) async -> Bool {
        if isWebSocketConnected { return true }
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            try? await Task.sleep(nanoseconds: 200_000_000) // 200ms
            if isWebSocketConnected { return true }
        }
        return false
    }

    func handleNetworkRestored() async {
        guard Clerk.shared.session != nil else { return }

        if case .authenticated = authState {
            await refreshTokenNow()
        } else {
            await resetApplicationSession(reason: "network_restored_while_not_authenticated")
        }
    }

    /// Force an immediate token refresh and restart the refresh timer.
    ///
    /// Call this when the app returns to the foreground after suspension.
    /// The Clerk JWT may have expired while suspended, causing all Convex
    /// queries to fail with "Not authenticated". This fetches a fresh token
    /// immediately rather than waiting for the next scheduled refresh.
    func refreshTokenNow() async {
        guard case .authenticated = authState else {
            logger.debug("Skipping token refresh — not authenticated")
            return
        }
        logger.info("Forcing immediate token refresh (app foregrounded)")
        // loginFromCache() emits .authenticated via Combine, which triggers
        // handleAuthStateChange → startTokenRefresh() automatically.
        _ = await client.loginFromCache()
    }

    /// Initiate a fresh login flow (called after the user completes Clerk sign-in).
    func login() async {
        _ = await client.login()
    }

    /// Rebuild the authenticated Convex client and force the SwiftUI tree to remount.
    ///
    /// This is the closest in-app equivalent to force quitting and relaunching:
    /// existing subscriptions are torn down, a fresh Convex client is created,
    /// and the root view gets a new identity so `@State`-owned objects are rebuilt.
    func resetApplicationSession(reason: String) async {
        if isResetting {
            logger.debug("Skipping reset (\(reason)) — already resetting")
            return
        }

        // No Clerk session means there's nothing to reset — the user is signed
        // out or mid sign-in (OTP flow). Bumping `resetID` here would destroy
        // the SwiftUI tree (including the lifted `pendingSignIn` state), kicking
        // the user back to the email entry screen.
        guard Clerk.shared.session != nil else {
            logger.debug("Skipping reset (\(reason)) — no Clerk session")
            if case .authenticated = authState {} else {
                // Assign directly (not via Combine) so handleAuthStateChange
                // doesn't fire token refresh during a mid-sign-in bailout. This
                // just ensures downstream observers don't stay in .loading.
                authState = .unauthenticated
            }
            return
        }

        let now = Date()
        guard now.timeIntervalSince(lastResetAt) >= Self.resetCooldownSeconds else {
            logger.debug("Skipping reset (\(reason)) — cooldown active")
            return
        }

        lastResetAt = now
        isResetting = true
        logger.notice("Resetting app session: \(reason)")
        SentryService.addBreadcrumb(
            message: "App session reset: \(reason)",
            category: "convex",
            level: .warning,
            data: ["reason": reason]
        )

        tokenRefreshTask?.cancel()
        tokenRefreshTask = nil
        webSocketRecoveryTask?.cancel()
        webSocketRecoveryTask = nil
        reconnectNotificationTask?.cancel()
        reconnectNotificationTask = nil

        // Detach old state-observation cancellables WITHOUT cancelling them.
        // Cancelling Combine subscriptions to ConvexMobile publishers while the
        // WebSocket is actively flapping can trigger a UniFFI Rust panic
        // (CHAPTERCHECK-IOS-9). The generation counter in bindClientState()
        // ensures these stale sinks are no-ops. They'll be cancelled naturally
        // when retiredCancellables is cleared after the flap storm settles.
        var retiring: [AnyCancellable] = []
        if let c = authStateCancellable { retiring.append(c) }
        if let c = webSocketStateCancellable { retiring.append(c) }
        authStateCancellable = nil
        webSocketStateCancellable = nil

        authState = .loading
        isWebSocketConnected = false
        wasWebSocketConnected = false
        flapTimestamps.removeAll()

        // Keep the old client and its cancellables alive so that in-flight
        // subscription cancellations (triggered by SwiftUI view teardown after
        // resetID changes) don't crash the already-freed UniFFI/Rust layer.
        retiredClient = client
        retiredCancellables = retiring
        client = Self.makeClient()
        bindClientState()
        resetID = UUID()

        // Release the retired client and cancellables after SwiftUI has had time
        // to tear down views and cancel their subscriptions, and the WebSocket
        // flap storm has settled so the Rust layer is stable for deferred cancels.
        Task { @MainActor [weak self] in
            try? await Task.sleep(for: .seconds(5))
            self?.retiredClient = nil
            self?.retiredCancellables.removeAll()
        }

        defer { isResetting = false }

        // Clerk session was present at function entry. Re-read defensively in
        // case the user signed out between then and now (e.g. in another tab or
        // via async Clerk invalidation) — the logout path handles state cleanup.
        guard networkMonitor.isConnected, Clerk.shared.session != nil else {
            return
        }

        _ = await client.loginFromCache()
        if case .authenticated = authState { return }

        logger.info("Cached Convex login did not recover session, performing fresh login")
        _ = await client.login()
    }

    /// Sign out of both Convex and Clerk, clearing user-specific caches.
    func logout() async {
        await client.logout()
        await ImageRepository.shared.clearCache()
    }

    // MARK: - Query Convenience Methods

    /// Subscribe to a Convex query and receive real-time updates via a Combine publisher.
    ///
    /// This is the primary way to read data from Convex. The publisher emits a new
    /// value whenever the underlying data changes on the server.
    ///
    /// - Parameters:
    ///   - name: Fully qualified query name (e.g., `"books/queries:getBook"`).
    ///   - args: Optional dictionary of arguments to pass to the query.
    /// - Returns: A publisher that emits decoded values of type `T`.
    func subscribe<T: Decodable>(
        to name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) -> AnyPublisher<T, ClientError> {
        logger.debug("Subscribe: \(name) args=\(String(describing: args)) -> \(String(describing: T.self))")
        return client.subscribe(to: name, with: args, yielding: T.self)
            .handleEvents(receiveCompletion: { [weak self] completion in
                guard case .failure(let error) = completion else { return }
                self?.handleClientError(error, context: "subscribe:\(name)")
            })
            .eraseToAnyPublisher()
    }

    /// Execute a one-shot Convex query by subscribing and taking the first emitted value.
    ///
    /// Use this for paginated "load more" fetches where a real-time subscription is not needed.
    func query<T: Decodable>(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws -> T {
        try await withCheckedThrowingContinuation { continuation in
            var cancellable: AnyCancellable?
            var didResume = false
            cancellable = client.subscribe(to: name, with: args, yielding: T.self)
                .first()
                .sink(
                    receiveCompletion: { completion in
                        guard !didResume else { return }
                        if case .failure(let error) = completion {
                            didResume = true
                            continuation.resume(throwing: error)
                        }
                        cancellable?.cancel()
                        cancellable = nil
                    },
                    receiveValue: { value in
                        guard !didResume else { return }
                        didResume = true
                        continuation.resume(returning: value)
                        cancellable?.cancel()
                        cancellable = nil
                    }
                )
        }
    }

    /// Execute a Convex mutation that returns a decoded value.
    func mutation<T: Decodable>(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws -> T {
        do {
            return try await client.mutation(name, with: args)
        } catch {
            handleClientError(error, context: "mutation:\(name)")
            throw error
        }
    }

    /// Execute a Convex mutation whose return value is ignored.
    ///
    /// Decodes via `DiscardedResult` to avoid crashes when the backend
    /// returns an object (e.g. `{ success: true }`) instead of null.
    func mutation(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws {
        do {
            let _: DiscardedResult = try await client.mutation(name, with: args)
        } catch {
            handleClientError(error, context: "mutation:\(name)")
            throw error
        }
    }

    /// Execute a Convex action that returns a decoded value.
    func action<T: Decodable>(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws -> T {
        do {
            return try await client.action(name, with: args)
        } catch {
            handleClientError(error, context: "action:\(name)")
            throw error
        }
    }

    /// Execute a Convex action whose return value is ignored.
    func action(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws {
        do {
            let _: DiscardedResult = try await client.action(name, with: args)
        } catch {
            handleClientError(error, context: "action:\(name)")
            throw error
        }
    }
}
