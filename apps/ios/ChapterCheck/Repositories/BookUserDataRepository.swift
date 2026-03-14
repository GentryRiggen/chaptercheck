import Combine
import ConvexMobile
import Foundation

/// The result returned by the `markAsRead` mutation.
struct MarkAsReadResult: Decodable, Sendable {
    let isRead: Bool
}


/// Repository for per-user book data: ratings, reviews, and read status.
///
/// Wraps the `bookUserData` Convex queries. All review queries return
/// public data enriched with user info; private reviews are filtered server-side.
@MainActor
final class BookUserDataRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to the current user's data for a specific book (rating, review, read status).
    /// Emits `nil` when no data exists for this user/book combination.
    func subscribeToMyBookData(bookId: String) -> AnyPublisher<BookUserData?, ClientError>? {
        convex.subscribe(
            to: "bookUserData/queries:getMyBookData",
            with: ["bookId": bookId]
        )
    }

    /// Subscribe to public reviews for a book (non-paginated, all reviews).
    func subscribeToPublicReviews(bookId: String) -> AnyPublisher<[PublicReview], ClientError>? {
        convex.subscribe(
            to: "bookUserData/queries:getPublicReviewsForBook",
            with: ["bookId": bookId]
        )
    }

    /// Subscribe to rating statistics for a book (average, count).
    func subscribeToRatingStats(bookId: String) -> AnyPublisher<RatingStats, ClientError>? {
        convex.subscribe(
            to: "bookUserData/queries:getBookRatingStats",
            with: ["bookId": bookId]
        )
    }

    /// Subscribe to books a user has marked as read.
    ///
    /// For the caller's own profile: includes private reads.
    /// For other users: only non-private reads are returned (filtered server-side).
    func subscribeToUserReadBooks(userId: String) -> AnyPublisher<[UserReadBook], ClientError>? {
        convex.subscribe(
            to: "bookUserData/queries:getUserReadBooks",
            with: ["userId": userId]
        )
    }

    /// Subscribe to a user's reviews with embedded book info.
    ///
    /// For the caller's own profile: includes private reviews.
    /// For other users: only public reviews are returned (filtered server-side).
    func subscribeToUserReviews(userId: String) -> AnyPublisher<[UserReview], ClientError>? {
        convex.subscribe(
            to: "bookUserData/queries:getUserPublicReviews",
            with: ["userId": userId]
        )
    }

    /// Subscribe to a paginated list of books a user has marked as read.
    func subscribeToUserReadBooksPaginated(
        userId: String,
        numItems: Int = 20,
        cursor: String? = nil
    ) -> AnyPublisher<PaginatedResult<UserReadBook>, ClientError>? {
        let paginationOpts: [String: ConvexEncodable?] = [
            "numItems": Double(numItems),
            "cursor": cursor,
        ]
        return convex.subscribe(
            to: "bookUserData/queries:getUserReadBooksPaginated",
            with: [
                "userId": userId,
                "paginationOpts": paginationOpts,
            ]
        )
    }

    /// Subscribe to a paginated list of a user's reviews.
    func subscribeToUserReviewsPaginated(
        userId: String,
        numItems: Int = 20,
        cursor: String? = nil
    ) -> AnyPublisher<PaginatedResult<UserReview>, ClientError>? {
        let paginationOpts: [String: ConvexEncodable?] = [
            "numItems": Double(numItems),
            "cursor": cursor,
        ]
        return convex.subscribe(
            to: "bookUserData/queries:getUserReviewsPaginated",
            with: [
                "userId": userId,
                "paginationOpts": paginationOpts,
            ]
        )
    }

    // MARK: - Mutations

    /// Set the reading status for a book (5-state model).
    ///
    /// - Parameters:
    ///   - bookId: The `_id` of the book.
    ///   - status: The new reading status.
    func setReadingStatus(bookId: String, status: ReadingStatus) async throws {
        try await convex.mutation(
            "bookUserData/mutations:setReadingStatus",
            with: ["bookId": bookId, "status": status.rawValue]
        )
    }

    /// Toggle the read status for a book.
    ///
    /// - Parameter bookId: The `_id` of the book.
    /// - Returns: A result containing the new `isRead` state.
    func markAsRead(bookId: String) async throws -> MarkAsReadResult {
        try await convex.mutation(
            "bookUserData/mutations:markAsRead",
            with: ["bookId": bookId]
        )
    }

    /// Save or update a review for a book. Also marks the book as read.
    ///
    /// - Parameters:
    ///   - bookId: The `_id` of the book.
    ///   - rating: Optional rating (1–3). Pass `nil` to omit.
    ///   - reviewText: Optional review body text. Pass `nil` or empty to omit.
    ///   - isReadPrivate: Whether to hide the read status from other users.
    ///   - isReviewPrivate: Whether to hide the full review from other users.
    func saveReview(
        bookId: String,
        rating: Int?,
        reviewText: String?,
        isReadPrivate: Bool,
        isReviewPrivate: Bool
    ) async throws {
        var args: [String: ConvexEncodable?] = [
            "bookId": bookId,
            "isReadPrivate": isReadPrivate,
            "isReviewPrivate": isReviewPrivate,
        ]
        if let rating {
            args["rating"] = Double(rating)
        }
        if let reviewText, !reviewText.isEmpty {
            args["reviewText"] = reviewText
        }
        try await convex.mutation(
            "bookUserData/mutations:saveReview",
            with: args
        )
    }
}
