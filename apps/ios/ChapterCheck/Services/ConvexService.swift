import Combine
import ConvexMobile
import Foundation

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

    // MARK: - Client

    let client: ConvexClientWithAuth<String>

    // MARK: - Private

    private var cancellables = Set<AnyCancellable>()
    private var tokenRefreshTask: Task<Void, Never>?

    /// Interval between proactive token refreshes (in seconds).
    /// Clerk JWTs expire after ~60s; refresh every 50s to stay ahead.
    private static let tokenRefreshInterval: UInt64 = 50

    // MARK: - Init

    private init() {
        let provider = ClerkConvexAuthProvider()
        client = ConvexClientWithAuth(
            deploymentUrl: AppEnvironment.convexUrl,
            authProvider: provider
        )

        // Forward the client's auth state to our published property
        // and manage token refresh lifecycle.
        client.authState
            .receive(on: DispatchQueue.main)
            .sink { [weak self] state in
                self?.authState = state
                self?.handleAuthStateChange(state)
            }
            .store(in: &cancellables)
    }

    /// Start or stop the token refresh timer based on auth state.
    /// Always cancels existing task first to avoid concurrent refreshes.
    private func handleAuthStateChange(_ state: AuthState<String>) {
        tokenRefreshTask?.cancel()
        tokenRefreshTask = nil

        if case .authenticated = state {
            startTokenRefresh()
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

    /// Initiate a fresh login flow (called after the user completes Clerk sign-in).
    func login() async {
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
        client.subscribe(to: name, with: args, yielding: T.self)
    }

    /// Execute a Convex mutation that returns a decoded value.
    func mutation<T: Decodable>(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws -> T {
        try await client.mutation(name, with: args)
    }

    /// Execute a Convex mutation that returns no value.
    func mutation(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws {
        try await client.mutation(name, with: args)
    }

    /// Execute a Convex action that returns a decoded value.
    func action<T: Decodable>(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws -> T {
        try await client.action(name, with: args)
    }

    /// Execute a Convex action that returns no value.
    func action(
        _ name: String,
        with args: [String: ConvexEncodable?]? = nil
    ) async throws {
        try await client.action(name, with: args)
    }
}
