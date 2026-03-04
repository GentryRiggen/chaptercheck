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

    init(
        _id: String,
        _creationTime: Double,
        title: String,
        subtitle: String? = nil,
        description: String? = nil,
        isbn: String? = nil,
        publishedYear: Double? = nil,
        coverImageR2Key: String? = nil,
        language: String? = nil,
        duration: Double? = nil,
        seriesId: String? = nil,
        seriesOrder: Double? = nil,
        averageRating: Double? = nil,
        ratingCount: Double? = nil,
        createdAt: Double,
        updatedAt: Double,
        authors: [BookAuthor],
        series: SeriesSummary? = nil
    ) {
        self._id = _id
        self._creationTime = _creationTime
        self.title = title
        self.subtitle = subtitle
        self.description = description
        self.isbn = isbn
        self.publishedYear = publishedYear
        self.coverImageR2Key = coverImageR2Key
        self.language = language
        self.duration = duration
        self.seriesId = seriesId
        self.seriesOrder = seriesOrder
        self.averageRating = averageRating
        self.ratingCount = ratingCount
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.authors = authors
        self.series = series
    }

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
/// Fields are mostly optional because different queries return different shapes:
/// - `listBooks` spreads the full author document + role from the join table.
/// - `getRecentBooks`/`getTopRatedBooks` return only `{ _id, name }`.
struct BookAuthor: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double?
    let name: String
    let bio: String?
    let imageR2Key: String?
    let role: String?
    let createdAt: Double?
    let updatedAt: Double?

    var id: String { _id }

    init(
        _id: String,
        _creationTime: Double? = nil,
        name: String,
        bio: String? = nil,
        imageR2Key: String? = nil,
        role: String? = nil,
        createdAt: Double? = nil,
        updatedAt: Double? = nil
    ) {
        self._id = _id
        self._creationTime = _creationTime
        self.name = name
        self.bio = bio
        self.imageR2Key = imageR2Key
        self.role = role
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

/// Lightweight series reference returned inline with book queries.
/// Only contains `_id` and `name`.
struct SeriesSummary: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let name: String

    var id: String { _id }
}
