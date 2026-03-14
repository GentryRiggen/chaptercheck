import ConvexMobile
import Foundation

/// Result of a book creation mutation — the Convex ID is returned as a string.
struct CreateBookResult: Decodable, Sendable {
    let value: String

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        value = try container.decode(String.self)
    }
}

/// Repository for book creation and mutation operations.
@MainActor
final class BookMutationRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    /// Create a new book in the library.
    ///
    /// - Returns: The `_id` of the newly created book.
    func createBook(
        title: String,
        subtitle: String? = nil,
        description: String? = nil,
        isbn: String? = nil,
        publishedYear: Int? = nil,
        coverImageR2Key: String? = nil,
        language: String? = nil
    ) async throws -> String {
        var args: [String: ConvexEncodable?] = ["title": title]
        if let subtitle { args["subtitle"] = subtitle }
        if let description { args["description"] = description }
        if let isbn { args["isbn"] = isbn }
        if let publishedYear { args["publishedYear"] = Double(publishedYear) }
        if let coverImageR2Key { args["coverImageR2Key"] = coverImageR2Key }
        if let language { args["language"] = language }

        let result: CreateBookResult = try await convex.mutation(
            "books/mutations:createBook",
            with: args
        )
        return result.value
    }
}
