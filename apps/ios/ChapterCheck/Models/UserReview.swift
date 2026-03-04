import Foundation

/// A review by a specific user, enriched with book info.
/// Matches the shape returned by `bookUserData/queries:getUserPublicReviews`.
struct UserReview: Decodable, Identifiable, Sendable {
    let _id: String
    let userId: String
    let bookId: String
    let rating: Double?
    let reviewText: String?
    let reviewedAt: Double?
    let isReviewPrivate: Bool
    let book: UserReviewBook?

    var id: String { _id }
    var ratingInt: Int? { rating.map { Int($0) } }
}

/// Lightweight book summary embedded in user review objects.
struct UserReviewBook: Decodable, Sendable {
    let _id: String
    let title: String
    let coverImageR2Key: String?
    let authors: [UserReviewBookAuthor]
}

/// Author name embedded in a user review's book summary.
struct UserReviewBookAuthor: Decodable, Identifiable, Sendable {
    let _id: String
    let name: String

    var id: String { _id }
}
