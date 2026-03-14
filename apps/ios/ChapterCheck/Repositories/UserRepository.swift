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

    /// Subscribe to a user's public profile.
    ///
    /// Returns `nil` when the profile does not exist.
    /// Stats are `nil` when the profile is private and not the caller's own.
    func subscribeToUserProfile(userId: String) -> AnyPublisher<UserProfile?, ClientError>? {
        convex.subscribe(
            to: "users/queries:getUserProfile",
            with: ["userId": userId]
        )
    }

    // MARK: - Mutations

    /// Update the current user's profile privacy setting.
    func updateProfilePrivacy(isPrivate: Bool) async throws {
        try await convex.mutation(
            "users/mutations:updateProfilePrivacy",
            with: ["isProfilePrivate": isPrivate]
        )
    }

    /// Permanently delete the current user's account and all associated data.
    func deleteAccount() async throws {
        try await convex.action("users/deleteAccount:deleteAccount")
    }
}
