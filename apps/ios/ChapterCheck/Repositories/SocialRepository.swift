import Combine
import ConvexMobile
import Foundation

@MainActor
final class SocialRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Mutations

    func followUser(userId: String) async throws {
        try await convex.mutation(
            "follows/mutations:followUser",
            with: ["userId": userId]
        )
    }

    func unfollowUser(userId: String) async throws {
        try await convex.mutation(
            "follows/mutations:unfollowUser",
            with: ["userId": userId]
        )
    }

    // MARK: - Subscriptions

    func subscribeToFollowStatus(userId: String) -> AnyPublisher<FollowStatus, ClientError>? {
        convex.subscribe(
            to: "follows/queries:getFollowStatus",
            with: ["userId": userId]
        )
    }

    func subscribeToMyFollowing() -> AnyPublisher<[FollowedUser], ClientError>? {
        convex.subscribe(to: "follows/queries:getMyFollowing")
    }

    func subscribeToMyFollowers() -> AnyPublisher<[FollowedUser], ClientError>? {
        convex.subscribe(to: "follows/queries:getMyFollowers")
    }

    func subscribeToUserFollowing(userId: String) -> AnyPublisher<[FollowedUser], ClientError>? {
        convex.subscribe(
            to: "follows/queries:getUserFollowing",
            with: ["userId": userId]
        )
    }

    func subscribeToUserFollowers(userId: String) -> AnyPublisher<[FollowedUser], ClientError>? {
        convex.subscribe(
            to: "follows/queries:getUserFollowers",
            with: ["userId": userId]
        )
    }

    func subscribeToActivityFeed(limit: Int = 20) -> AnyPublisher<PaginatedActivityResult, ClientError>? {
        convex.subscribe(
            to: "follows/queries:getActivityFeed",
            with: ["limit": Double(limit)]
        )
    }

    func subscribeToCommunityActivity(limit: Int = 20) -> AnyPublisher<PaginatedActivityResult, ClientError>? {
        convex.subscribe(
            to: "follows/queries:getCommunityActivity",
            with: ["limit": Double(limit)]
        )
    }

    // MARK: - Paginated Fetches (one-shot)

    func fetchOlderActivityFeed(beforeTimestamp: Double, limit: Int = 20) async throws -> PaginatedActivityResult {
        try await convex.query(
            "follows/queries:getActivityFeed",
            with: ["limit": Double(limit), "beforeTimestamp": beforeTimestamp]
        )
    }

    func fetchOlderCommunityActivity(beforeTimestamp: Double, limit: Int = 20) async throws -> PaginatedActivityResult {
        try await convex.query(
            "follows/queries:getCommunityActivity",
            with: ["limit": Double(limit), "beforeTimestamp": beforeTimestamp]
        )
    }
}
