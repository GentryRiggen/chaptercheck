import Foundation

/// A shelf summary for list views. Matches `shelves/queries:getUserShelves` response items.
struct Shelf: Decodable, Identifiable, Sendable {
    let _id: String
    let userId: String
    let name: String
    let description: String?
    let isOrdered: Bool
    let isPublic: Bool
    let createdAt: Double
    let updatedAt: Double
    let bookCount: Double
    let previewBooks: [ShelfPreviewBook]

    var id: String { _id }
    var bookCountInt: Int { Int(bookCount) }
}

/// Lightweight book reference used in the shelf card cover stack.
struct ShelfPreviewBook: Decodable, Sendable {
    let _id: String
    let title: String
    let coverImageR2Key: String?
}

/// Wrapper for `shelves/queries:getUserShelves` response.
struct UserShelvesResponse: Decodable, Sendable {
    let shelves: [Shelf]
    let isOwner: Bool
}

/// Full shelf detail with books. Matches `shelves/queries:getShelf` response.
struct ShelfDetail: Decodable, Identifiable, Sendable {
    let _id: String
    let userId: String
    let name: String
    let description: String?
    let isOrdered: Bool
    let isPublic: Bool
    let createdAt: Double
    let updatedAt: Double
    let isOwner: Bool
    let owner: ShelfOwner?
    let books: [ShelfBook]

    var id: String { _id }
}

/// Owner metadata returned alongside a shelf detail.
struct ShelfOwner: Decodable, Sendable {
    let _id: String
    let name: String?
    let imageUrl: String?

    var displayName: String { name ?? "Anonymous" }
}

/// A book within a shelf. Matches the shape in `shelves/queries:getShelf` books array.
struct ShelfBook: Decodable, Identifiable, Sendable {
    let _id: String
    let title: String
    let subtitle: String?
    let coverImageR2Key: String?
    let duration: Double?
    let seriesOrder: Double?
    let averageRating: Double?
    let ratingCount: Double?
    let shelfBookId: String
    let position: Double?
    let authors: [ShelfBookAuthor]
    let series: SeriesSummary?

    var id: String { _id }
}

/// An author attached to a shelf book.
struct ShelfBookAuthor: Decodable, Sendable {
    let _id: String
    let name: String
    let role: String?
}

/// A shelf summary with a `containsBook` flag for the "Add to Shelf" sheet.
/// Matches `shelves/queries:getMyShelvesForBook` response items.
struct ShelfForBook: Decodable, Identifiable, Sendable {
    let _id: String
    let name: String
    let isOrdered: Bool
    let containsBook: Bool

    var id: String { _id }
}
