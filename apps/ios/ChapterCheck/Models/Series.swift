import Foundation

/// A full series document from the `series` table.
/// Matches the shape returned by `series:getSeries` and `series:listSeries`.
struct Series: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let name: String
    let description: String?
    let createdAt: Double
    let updatedAt: Double

    var id: String { _id }
}

/// Enriched series with preview data for list cards.
/// Matches `series/queries:listSeriesWithPreviews`.
struct SeriesWithPreview: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let name: String
    let description: String?
    let createdAt: Double
    let updatedAt: Double
    let bookCount: Double
    let previewCovers: [SeriesPreviewCover]
    let authors: [SeriesPreviewAuthor]

    var id: String { _id }
    var bookCountInt: Int { Int(bookCount) }
}

struct SeriesPreviewCover: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let coverImageR2Key: String?

    var id: String { _id }
}

struct SeriesPreviewAuthor: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let name: String

    var id: String { _id }
}
