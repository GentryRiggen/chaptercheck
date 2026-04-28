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

    private let logger = AppLogger(category: "ClerkConvexAuthProvider")

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
        await logoutOnMain()
    }

    func extractIdToken(from authResult: String) -> String {
        authResult
    }

    // MARK: - Private Helpers

    /// Signs out on the main actor since Clerk is MainActor-isolated.
    ///
    /// Errors from Clerk are caught and logged rather than propagated. If we
    /// rethrew, ConvexMobile's `client.logout()` would short-circuit and never
    /// emit `.unauthenticated`, leaving the app stuck on the authenticated UI.
    /// The user explicitly requested sign-out — we always proceed with local
    /// cleanup even if Clerk's network call fails (e.g. expired session, 4xx).
    @MainActor
    private func logoutOnMain() async {
        logger.info("Clerk signOut starting")
        do {
            try await Clerk.shared.auth.signOut()
            logger.info("Clerk signOut succeeded — session=\(Clerk.shared.session == nil ? "nil" : "non-nil")")
        } catch {
            logger.error("Clerk signOut threw: \(error.localizedDescription) — continuing local cleanup")
            SentryService.addBreadcrumb(
                message: "Clerk signOut threw — continuing local cleanup",
                category: "auth",
                level: .warning,
                data: ["error": error.localizedDescription]
            )
        }
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
