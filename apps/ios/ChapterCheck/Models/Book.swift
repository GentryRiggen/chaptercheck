import Foundation

/// A book with its related authors and optional series info.
/// Matches the shape returned by `books:listBooks`, `books:getBook`,
/// `books:searchBooks`, `books:getRecentBooks`, and `books:getTopRatedBooks`.
struct BookWithDetails: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let title: String
    let subtitle: String?
    let description: String?
    let isbn: String?
    let publishedYear: Double?
    let coverImageR2Key: String?
    let language: String?
    let duration: Double?
    let seriesId: String?
    let seriesOrder: Double?
    let averageRating: Double?
    let ratingCount: Double?
    let createdAt: Double
    let updatedAt: Double
    let authors: [BookAuthor]
    let series: SeriesSummary?

    var id: String { _id }

    var ratingCountInt: Int { Int(ratingCount ?? 0) }

    /// Duration formatted as "Xh Ym"
    var formattedDuration: String? {
        guard let duration else { return nil }
        let totalSeconds = Int(duration)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        return "\(minutes)m"
    }

    func hash(into hasher: inout Hasher) {
        hasher.combine(_id)
    }

    static func == (lhs: BookWithDetails, rhs: BookWithDetails) -> Bool {
        lhs._id == rhs._id
    }
}

/// An author attached to a book, including the optional role (author, narrator, etc.).
/// Matches the enriched author shape from book queries that spread the full author
/// document and add the `role` field from the `bookAuthors` join table.
struct BookAuthor: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let name: String
    let bio: String?
    let imageR2Key: String?
    let role: String?
    let createdAt: Double
    let updatedAt: Double

    var id: String { _id }
}

/// Lightweight series reference returned inline with book queries.
/// Only contains `_id` and `name`.
struct SeriesSummary: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let name: String

    var id: String { _id }
}
