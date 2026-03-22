import Combine
import ConvexMobile
import Foundation

/// Repository for user block/unblock mutations and real-time block status queries.
///
/// All Convex calls delegate to `ConvexService`. Subscriptions return Combine
/// publishers that emit whenever the underlying data changes on the server.
@MainActor
final class BlockRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Mutations

    /// Block another user by their Convex user ID.
    func blockUser(blockedUserId: String) async throws {
        try await convex.mutation(
            "blocks/mutations:blockUser",
            with: ["blockedUserId": blockedUserId]
        )
    }

    /// Remove a previously placed block on another user.
    func unblockUser(blockedUserId: String) async throws {
        try await convex.mutation(
            "blocks/mutations:unblockUser",
            with: ["blockedUserId": blockedUserId]
        )
    }

    // MARK: - Subscriptions

    /// Subscribe to the block relationship between the current user and another user.
    ///
    /// Emits `BlockStatus` whenever the relationship changes (e.g. after blocking or unblocking).
    func subscribeToBlockStatus(otherUserId: String) -> AnyPublisher<BlockStatus, ClientError>? {
        convex.subscribe(
            to: "blocks/queries:getBlockStatus",
            with: ["otherUserId": otherUserId]
        )
    }

    /// Subscribe to the full list of users blocked by the current user.
    func subscribeToBlockedUsers() -> AnyPublisher<[BlockedUser], ClientError>? {
        convex.subscribe(to: "blocks/queries:getMyBlockedUsers")
    }
}
