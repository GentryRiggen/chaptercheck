import Foundation

/// A standalone author document from the `authors` table.
/// Matches the shape returned by `authors:getAuthor`.
struct Author: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let name: String
    let bio: String?
    let imageR2Key: String?
    let createdAt: Double
    let updatedAt: Double

    var id: String { _id }
}

/// An author enriched with book and series counts.
/// Matches the shape returned by `authors:listAuthors`, `authors:searchAuthors`,
/// and `authors:getRecentAuthors`.
struct AuthorWithCounts: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let name: String
    let bio: String?
    let imageR2Key: String?
    let createdAt: Double
    let updatedAt: Double
    let bookCount: Double
    let seriesCount: Double

    var id: String { _id }
    var bookCountInt: Int { Int(bookCount) }
    var seriesCountInt: Int { Int(seriesCount) }
}

/// A book belonging to an author, returned by `authors:getAuthorBooks`.
/// This is a full book document with an added `role` field from the join table.
struct AuthorBook: Decodable, Identifiable, Hashable, Sendable {
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
    let role: String?

    var id: String { _id }
}

/// Series info returned by `authors:getAuthorSeries`.
struct AuthorSeries: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let name: String
    let description: String?
    let bookCountByAuthor: Double

    var id: String { _id }
    var bookCountByAuthorInt: Int { Int(bookCountByAuthor) }
}
