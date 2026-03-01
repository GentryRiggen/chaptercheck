import Foundation

/// A genre from the `genres` table.
struct Genre: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let name: String
    let slug: String
    let createdAt: Double
    let updatedAt: Double

    var id: String { _id }
}

/// A genre with vote information for a specific book.
struct BookGenre: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let name: String
    let slug: String
    let voteCount: Double
    let userHasVoted: Bool

    var id: String { _id }
    var voteCountInt: Int { Int(voteCount) }
}
