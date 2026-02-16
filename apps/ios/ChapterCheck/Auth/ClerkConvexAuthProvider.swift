import ConvexMobile
import ClerkKit
import Foundation

/// Bridges Clerk authentication with the Convex client.
///
/// Conforms to ConvexMobile's `AuthProvider<String>` where `T = String` is the
/// raw JWT token. Both `login()` and `loginFromCache()` fetch a fresh Clerk JWT
/// using the "convex" template. Token refresh is handled externally by
/// `ConvexService`, which periodically calls `loginFromCache()` on the
/// `ConvexClientWithAuth` to keep the Convex WebSocket authenticated.
final class ClerkConvexAuthProvider: AuthProvider {
    typealias T = String

    // MARK: - AuthProvider

    func login() async throws -> String {
        try await fetchToken()
    }

    func loginFromCache() async throws -> String {
        // Clerk persists sessions across launches, so loginFromCache
        // follows the same path as login.
        try await fetchToken()
    }

    func logout() async throws {
        try await logoutOnMain()
    }

    func extractIdToken(from authResult: String) -> String {
        authResult
    }

    // MARK: - Private Helpers

    /// Signs out on the main actor since Clerk is MainActor-isolated.
    @MainActor
    private func logoutOnMain() async throws {
        try await Clerk.shared.auth.signOut()
    }

    /// Fetches a fresh JWT from the current Clerk session using the "convex"
    /// template defined in the Clerk dashboard.
    @MainActor
    private func fetchTokenOnMain() async throws -> String {
        guard let token = try await Clerk.shared.auth.getToken(
            .init(template: "convex")
        ) else {
            throw AuthError.noToken
        }
        return token
    }

    private func fetchToken() async throws -> String {
        try await fetchTokenOnMain()
    }
}

// MARK: - Errors

extension ClerkConvexAuthProvider {
    enum AuthError: LocalizedError {
        case noToken

        var errorDescription: String? {
            switch self {
            case .noToken:
                return "Unable to retrieve authentication token from Clerk."
            }
        }
    }
}
