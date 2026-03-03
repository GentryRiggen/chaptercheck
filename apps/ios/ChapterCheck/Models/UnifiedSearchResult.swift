import Foundation

/// Combined search results for books and authors.
/// Matches the shape returned by `search/queries:searchAll`.
struct UnifiedSearchResult: Decodable, Sendable {
    let books: [BookWithDetails]
    let authors: [AuthorWithCounts]
}
