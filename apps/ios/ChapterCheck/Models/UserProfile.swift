import Foundation

/// User profile returned by `users/queries:getUserProfile`.
struct UserProfile: Decodable, Identifiable, Sendable {
    let _id: String
    let name: String?
    let imageUrl: String?
    let createdAt: Double
    let isOwnProfile: Bool
    let isProfilePrivate: Bool
    let stats: UserProfileStats?

    var id: String { _id }
    var displayName: String { name ?? "Anonymous" }
}

/// Aggregate statistics returned alongside a user profile.
struct UserProfileStats: Decodable, Sendable {
    let booksRead: Double
    let reviewsWritten: Double
    let shelvesCount: Double

    var booksReadInt: Int { Int(booksRead) }
    var reviewsWrittenInt: Int { Int(reviewsWritten) }
    var shelvesCountInt: Int { Int(shelvesCount) }
}

/// A book the user has marked as read, from `bookUserData/queries:getUserReadBooks`.
///
/// Own-profile responses include private reads; public responses filter them out server-side.
struct UserReadBook: Decodable, Identifiable, Sendable {
    let _id: String
    let title: String
    let coverImageR2Key: String?
    let seriesOrder: Double?
    let averageRating: Double?
    let ratingCount: Double?
    let authors: [BookAuthorSummary]
    let series: SeriesSummary?
    let readAt: Double?
    let userRating: Double?
    let userReviewText: String?
    let isReviewPrivate: Bool
    let isReadPrivate: Bool

    var id: String { _id }
    var userRatingInt: Int? { userRating.map { Int($0) } }

    /// Primary author name, excluding narrators.
    var primaryAuthorName: String? {
        authors.first?.name
    }
}
