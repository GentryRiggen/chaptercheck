import Combine
import ConvexMobile
import Foundation

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
}
