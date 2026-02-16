import Combine
import ConvexMobile
import Foundation

/// Repository for book-related Convex queries.
///
/// Provides reactive subscriptions (Combine publishers) for real-time data
/// and one-shot async methods where subscriptions are not practical (e.g., pagination).
/// All methods delegate to `ConvexService.shared` for network calls.
@MainActor
final class BookRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to a single book by ID. Emits `nil` when the book is not found.
    func subscribeToBook(id: String) -> AnyPublisher<BookWithDetails?, ClientError>? {
        convex.subscribe(
            to: "books/queries:getBook",
            with: ["bookId": id]
        )
    }

    /// Subscribe to recently added books for the home page.
    func subscribeToRecentBooks(limit: Int = 6) -> AnyPublisher<[BookWithDetails], ClientError>? {
        convex.subscribe(
            to: "books/queries:getRecentBooks",
            with: ["limit": limit]
        )
    }

    /// Subscribe to top-rated books for the home page.
    func subscribeToTopRatedBooks(limit: Int = 6) -> AnyPublisher<[BookWithDetails], ClientError>? {
        convex.subscribe(
            to: "books/queries:getTopRatedBooks",
            with: ["limit": limit]
        )
    }

    /// Subscribe to aggregate library statistics for the home page.
    func subscribeToHomeStats() -> AnyPublisher<HomeStats, ClientError>? {
        convex.subscribe(to: "books/queries:getHomeStats")
    }

    /// Subscribe to a paginated book list.
    ///
    /// Convex pagination requires `paginationOpts` as a nested dictionary with
    /// `numItems` and an optional `cursor`. Each emission represents the current
    /// state of that page; combine multiple subscriptions for infinite scroll.
    ///
    /// - Parameters:
    ///   - sort: Sort order. One of `"title_asc"`, `"title_desc"`, `"recent"`, `"top_rated"`.
    ///   - numItems: Number of items per page.
    ///   - cursor: Opaque cursor from a previous page result, or `nil` for the first page.
    func subscribeToBookList(
        sort: String = "title_asc",
        numItems: Int = 20,
        cursor: String? = nil
    ) -> AnyPublisher<PaginatedResult<BookWithDetails>, ClientError>? {
        var paginationOpts: [String: ConvexEncodable?] = ["numItems": numItems]
        if let cursor {
            paginationOpts["cursor"] = cursor
        }

        return convex.subscribe(
            to: "books/queries:listBooks",
            with: [
                "paginationOpts": paginationOpts,
                "sort": sort,
            ]
        )
    }

    /// Subscribe to book search results.
    ///
    /// The caller is responsible for debouncing the query string before creating
    /// a new subscription. Returns an empty array for blank queries.
    func subscribeToBookSearch(query: String) -> AnyPublisher<[BookWithDetails], ClientError>? {
        convex.subscribe(
            to: "books/queries:searchBooks",
            with: ["search": query]
        )
    }
}
