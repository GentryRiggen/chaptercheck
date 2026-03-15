import Combine
import ClerkKit
import ConvexMobile
import Foundation
import os

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

    private let logger = Logger(subsystem: "com.chaptercheck", category: "ConvexService")
    private let networkMonitor = NetworkMonitor.shared
    private var authStateCancellable: AnyCancellable?
    private var webSocketStateCancellable: AnyCancellable?
    private var tokenRefreshTask: Task<Void, Never>?
    private var webSocketRecoveryTask: Task<Void, Never>?
    private var lastBackgroundedAt: Date?
    private var lastResetAt = Date.distantPast
    private var wasWebSocketConnected = false

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
        authStateCancellable?.cancel()
        authStateCancellable = client.authState
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.authState = state
                self?.handleAuthStateChange(state)
            }

        webSocketStateCancellable?.cancel()
        webSocketStateCancellable = client.watchWebSocketState()
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.handleWebSocketStateChange(state)
            }
    }

    private func handleWebSocketStateChange(_ state: WebSocketState) {
        let wasConnected = wasWebSocketConnected
        let nowConnected = (state == .connected)
        isWebSocketConnected = nowConnected
        wasWebSocketConnected = nowConnected

        if !wasConnected && nowConnected {
            logger.info("WebSocket connected")
            NotificationCenter.default.post(name: .convexReconnected, object: nil)
            webSocketRecoveryTask?.cancel()
            webSocketRecoveryTask = nil
            SentryService.addBreadcrumb(message: "Convex WebSocket connected", category: "convex")
        } else if wasConnected && !nowConnected {
            logger.info("WebSocket disconnected (state: \(String(describing: state)))")
            SentryService.addBreadcrumb(
                message: "Convex WebSocket disconnected",
                category: "convex",
                level: .warning,
                data: ["state": String(describing: state)]
            )
            startWebSocketRecoveryWatchdog()
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

        guard networkMonitor.isConnected else { return }

        logger.info("App became active after \(Int(backgroundDuration))s in background")

        if case .authenticated = authState {
            await refreshTokenNow()
        } else if Clerk.shared.session != nil {
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
        if isResetting { return }

        let now = Date()
        guard now.timeIntervalSince(lastResetAt) >= Self.resetCooldownSeconds else {
            logger.debug("Skipping reset (\(reason, privacy: .public)) — cooldown active")
            return
        }

        lastResetAt = now
        isResetting = true
        logger.notice("Resetting app session: \(reason, privacy: .public)")
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
        authStateCancellable?.cancel()
        authStateCancellable = nil
        webSocketStateCancellable?.cancel()
        webSocketStateCancellable = nil
        authState = .loading
        isWebSocketConnected = false
        wasWebSocketConnected = false

        client = Self.makeClient()
        bindClientState()
        resetID = UUID()

        defer { isResetting = false }

        guard networkMonitor.isConnected, Clerk.shared.session != nil else {
            if Clerk.shared.session == nil {
                authState = .unauthenticated
            }
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
