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
