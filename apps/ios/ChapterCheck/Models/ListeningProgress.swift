import Foundation

/// Raw listening progress record from the `listeningProgress` table.
/// Matches the shape returned by `listeningProgress:getProgressForBook`.
struct ListeningProgress: Decodable, Identifiable, Sendable {
    let _id: String
    let _creationTime: Double
    let userId: String
    let bookId: String
    let audioFileId: String
    let positionSeconds: Double
    let playbackRate: Double
    let lastListenedAt: Double
    let createdAt: Double
    let updatedAt: Double

    var id: String { _id }
}

/// Enriched listening progress for the "Continue Listening" section.
/// Matches the shape returned by `listeningProgress:getRecentlyListening`.
struct RecentListeningProgress: Decodable, Identifiable, Sendable {
    let _id: String
    let bookId: String
    let book: RecentListeningBook
    let audioFile: RecentListeningAudioFile
    let positionSeconds: Double
    let playbackRate: Double
    let progressFraction: Double
    let totalParts: Double
    let lastListenedAt: Double

    var id: String { _id }
    var totalPartsInt: Int { Int(totalParts) }

    /// Progress as a percentage string like "42%"
    var formattedProgress: String {
        let percent = Int(progressFraction * 100)
        return "\(percent)%"
    }
}

struct RecentListeningBook: Decodable, Sendable {
    let title: String
    let coverImageR2Key: String?
    let seriesOrder: Double?
    let authors: [BookAuthorSummary]
    let series: SeriesSummary?
}

struct RecentListeningAudioFile: Decodable, Sendable {
    let _id: String
    let partNumber: Double?
    let duration: Double
    let displayName: String
}

/// Lightweight author summary used in nested query results.
/// Only contains `_id` and `name`.
struct BookAuthorSummary: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let name: String

    var id: String { _id }
}
