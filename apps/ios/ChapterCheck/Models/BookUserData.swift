import Foundation

/// Per-user data for a book (read status, rating, review).
/// Matches the shape returned by `bookUserData:getMyBookData`.
struct BookUserData: Decodable, Identifiable, Sendable {
    let _id: String
    let _creationTime: Double
    let userId: String
    let bookId: String
    let isRead: Bool
    let readAt: Double?
    let rating: Double?
    let reviewText: String?
    let reviewedAt: Double?
    let isReadPrivate: Bool
    let isReviewPrivate: Bool
    let createdAt: Double
    let updatedAt: Double

    // Reading status fields
    let status: String?
    let startedAt: Double?
    let finishedAt: Double?
    let lastStatusChangedAt: Double?
    let rereadCount: Double?
    let currentFormat: String?
    let favorite: Bool?
    let personalSummary: String?

    var id: String { _id }
    var ratingInt: Int? { rating.map { Int($0) } }

    /// Parsed reading status, with legacy `isRead` fallback.
    var readingStatus: ReadingStatus? {
        ReadingStatus(statusString: status, isRead: isRead)
    }
}
