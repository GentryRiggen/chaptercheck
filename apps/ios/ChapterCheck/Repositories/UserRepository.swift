import Combine
import ConvexMobile
import Foundation

/// Repository for current-user queries.
///
/// The primary consumer is the auth/permissions layer, which uses
/// `subscribeToCurrentUser` to reactively track the user's role and
/// premium status so the UI can show or hide features accordingly.
@MainActor
final class UserRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to the current authenticated user with computed permissions.
    ///
    /// Emits `nil` when the user is not authenticated or the Clerk identity
    /// has not yet been synced to the Convex `users` table.
    func subscribeToCurrentUser() -> AnyPublisher<UserWithPermissions?, ClientError>? {
        convex.subscribe(to: "users/queries:getCurrentUserWithPermissions")
    }
}
