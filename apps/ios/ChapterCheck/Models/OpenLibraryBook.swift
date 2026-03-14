import Foundation

/// Author entry from an OpenLibrary search result.
struct OpenLibraryAuthor: Decodable, Sendable {
    let name: String
    let key: String?
}

/// Book suggestion from an OpenLibrary search.
/// Matches the shape returned by `openLibrary/actions:searchBooks`.
struct OpenLibraryBookSuggestion: Decodable, Identifiable, Sendable {
    let key: String
    let title: String
    let subtitle: String?
    let description: String?
    let isbn: String?
    let publishedYear: Double?
    let language: String?
    let coverUrl: String?
    let authors: [OpenLibraryAuthor]

    var id: String { key }

    var publishedYearInt: Int? {
        publishedYear.map { Int($0) }
    }

    var authorNames: String {
        authors.map(\.name).joined(separator: ", ")
    }
}
