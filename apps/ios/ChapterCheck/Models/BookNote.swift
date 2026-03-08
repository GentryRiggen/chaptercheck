import Foundation

struct NoteCategory: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let userId: String
    let name: String
    let colorToken: String
    let createdAt: Double
    let updatedAt: Double

    var id: String { _id }
}

struct BookNoteAudioFile: Decodable, Hashable, Sendable {
    let _id: String
    let displayName: String
    let fileName: String
    let partNumber: Double?
    let chapterNumber: Double?
    let duration: Double

    var partNumberInt: Int? { partNumber.map(Int.init) }
}

struct BookNoteCategorySummary: Decodable, Hashable, Sendable {
    let _id: String
    let name: String
    let colorToken: String
}

struct BookNote: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let userId: String
    let bookId: String
    let audioFileId: String
    let categoryId: String?
    let startSeconds: Double
    let endSeconds: Double
    let noteText: String?
    let createdAt: Double
    let updatedAt: Double
    let audioFile: BookNoteAudioFile
    let category: BookNoteCategorySummary?

    var id: String { _id }
    var durationSeconds: Double { endSeconds - startSeconds }
    var formattedRange: String {
        "\(TimeFormatting.formatTime(startSeconds))-\(TimeFormatting.formatTime(endSeconds))"
    }
    var formattedDuration: String {
        TimeFormatting.formatDuration(durationSeconds)
    }
    var displayTitle: String {
        if let partNumber = audioFile.partNumberInt {
            return "Part \(partNumber)"
        }
        return audioFile.displayName
    }
}
