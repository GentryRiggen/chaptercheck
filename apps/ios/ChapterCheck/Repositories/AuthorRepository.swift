import Combine
import ConvexMobile
import Foundation

/// Repository for author-related Convex queries.
///
/// Mirrors the web app's author data access patterns: single author detail,
/// paginated/search listing, and author-specific books and series.
@MainActor
final class AuthorRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to a single author by ID. Emits `nil` when the author is not found.
    func subscribeToAuthor(id: String) -> AnyPublisher<Author?, ClientError>? {
        convex.subscribe(
            to: "authors/queries:getAuthor",
            with: ["authorId": id]
        )
    }

    /// Subscribe to a paginated list of authors with book/series counts.
    ///
    /// - Parameters:
    ///   - sort: Sort order. One of `"name_asc"`, `"name_desc"`, `"recent"`.
    ///   - numItems: Number of items per page.
    ///   - cursor: Opaque cursor from a previous page result, or `nil` for the first page.
    func subscribeToAuthorList(
        sort: String = "name_asc",
        numItems: Int = 20,
        cursor: String? = nil
    ) -> AnyPublisher<PaginatedResult<AuthorWithCounts>, ClientError>? {
        var paginationOpts: [String: ConvexEncodable?] = ["numItems": numItems]
        if let cursor {
            paginationOpts["cursor"] = cursor
        }

        return convex.subscribe(
            to: "authors/queries:listAuthors",
            with: [
                "paginationOpts": paginationOpts,
                "sort": sort,
            ]
        )
    }

    /// Subscribe to author search results with book/series counts.
    func subscribeToAuthorSearch(query: String) -> AnyPublisher<[AuthorWithCounts], ClientError>? {
        convex.subscribe(
            to: "authors/queries:searchAuthors",
            with: ["search": query]
        )
    }

    /// Subscribe to all books by a specific author. Each book includes its `role`
    /// from the join table (e.g., "Author", "Narrator").
    func subscribeToAuthorBooks(authorId: String) -> AnyPublisher<[AuthorBook], ClientError>? {
        convex.subscribe(
            to: "authors/queries:getAuthorBooks",
            with: ["authorId": authorId]
        )
    }

    /// Subscribe to series that contain books by this author.
    func subscribeToAuthorSeries(authorId: String) -> AnyPublisher<[AuthorSeries], ClientError>? {
        convex.subscribe(
            to: "authors/queries:getAuthorSeries",
            with: ["authorId": authorId]
        )
    }
}
