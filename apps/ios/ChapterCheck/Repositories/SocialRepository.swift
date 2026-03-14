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

    func subscribeToActivityFeed() -> AnyPublisher<[ActivityItem], ClientError>? {
        convex.subscribe(to: "follows/queries:getActivityFeed")
    }

    func subscribeToCommunityActivity() -> AnyPublisher<[ActivityItem], ClientError>? {
        convex.subscribe(to: "follows/queries:getCommunityActivity")
    }
}
