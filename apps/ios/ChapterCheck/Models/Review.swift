import Foundation

/// A public review for a book, enriched with user info and ownership flag.
/// Matches the shape returned by `bookUserData/queries:getPublicReviewsForBook`
/// and `bookUserData/queries:getPublicReviewsForBookPaginated`.
struct PublicReview: Decodable, Identifiable, Sendable {
    let _id: String
    let userId: String
    let bookId: String
    let isRead: Bool
    let rating: Double?
    let reviewText: String?
    let reviewedAt: Double?
    let isReviewPrivate: Bool
    let isOwnReview: Bool?
    let user: ReviewUser?
    let createdAt: Double
    let updatedAt: Double

    var id: String { _id }
    var ratingInt: Int? { rating.map { Int($0) } }
}

/// Lightweight user summary embedded in review objects.
struct ReviewUser: Decodable, Sendable {
    let _id: String
    let name: String?
    let imageUrl: String?

    var displayName: String { name ?? "Anonymous" }
}

/// Aggregate rating statistics for a book.
/// Matches the shape returned by `bookUserData/queries:getBookRatingStats`.
struct RatingStats: Decodable, Sendable {
    let averageRating: Double?
    let ratingCount: Double
    let reviewCount: Double

    var ratingCountInt: Int { Int(ratingCount) }
    var reviewCountInt: Int { Int(reviewCount) }
}
