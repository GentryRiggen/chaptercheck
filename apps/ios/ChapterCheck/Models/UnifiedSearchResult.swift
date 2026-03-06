import Foundation

/// Combined search results for books, authors, series, and users.
/// Matches the shape returned by `search/queries:searchAll`.
struct UnifiedSearchResult: Decodable, Sendable {
    let books: [BookWithDetails]
    let authors: [AuthorWithCounts]
    let series: [SearchSeries]?
    let users: [SearchUser]?
}

/// A series returned from the unified search query.
struct SearchSeries: Decodable, Identifiable, Sendable {
    let _id: String
    let name: String
    let description: String?
    let bookCount: Double

    var id: String { _id }
    var bookCountInt: Int { Int(bookCount) }
}

/// A user returned from the unified search query.
struct SearchUser: Decodable, Identifiable, Sendable {
    let _id: String
    let name: String?
    let imageUrl: String?

    var id: String { _id }
    var displayName: String { name ?? "Anonymous" }
}
