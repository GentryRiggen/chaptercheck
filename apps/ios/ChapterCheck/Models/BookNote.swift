import Foundation
import SwiftUI

struct MemoryTag: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let name: String
    let normalizedName: String

    var id: String { _id }
}

extension MemoryTag {
    /// Deterministic display color derived from the tag name.
    ///
    /// Uses a stable DJB2 hash (not `String.hashValue`, which is randomized
    /// per process) so the same tag always maps to the same color across
    /// app launches.
    var displayColor: Color {
        let tokens = AccentColorToken.all
        var hash: UInt64 = 5381
        for byte in name.utf8 {
            hash = ((hash &<< 5) &+ hash) &+ UInt64(byte)
        }
        let index = Int(hash % UInt64(tokens.count))
        return tokens[index].color
    }
}

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

// MARK: - Shared Entry Type Logic

/// Shared computed properties for note types that have `entryType`, `startSeconds`,
/// `endSeconds`, and `audioFileId` fields.
protocol NoteEntryDisplayable {
    var entryType: String? { get }
    var audioFileId: String? { get }
    var startSeconds: Double? { get }
    var endSeconds: Double? { get }
}

extension NoteEntryDisplayable {
    var isAudioAnchored: Bool { audioFileId != nil }

    var durationSeconds: Double {
        guard let start = startSeconds, let end = endSeconds else { return 0 }
        return end - start
    }

    var formattedRange: String {
        guard let start = startSeconds, let end = endSeconds else { return "" }
        return "\(TimeFormatting.formatTime(start))-\(TimeFormatting.formatTime(end))"
    }

    var formattedDuration: String {
        guard durationSeconds > 0 else { return "" }
        return TimeFormatting.formatDuration(durationSeconds)
    }

    var entryTypeLabel: String {
        switch entryType {
        case "note": return "Note"
        case "quote": return "Quote"
        case "takeaway": return "Takeaway"
        case "theme": return "Theme"
        case "character": return "Character"
        case "discussion_prompt": return "Discussion"
        default: return "Note"
        }
    }

    var entryTypeIcon: String {
        switch entryType {
        case "note": return "note.text"
        case "quote": return "quote.opening"
        case "takeaway": return "lightbulb"
        case "theme": return "paintpalette"
        case "character": return "person"
        case "discussion_prompt": return "bubble.left.and.bubble.right"
        default: return "note.text"
        }
    }
}

struct BookNote: Decodable, Identifiable, Hashable, Sendable, NoteEntryDisplayable {
    let _id: String
    let _creationTime: Double
    let userId: String
    let bookId: String
    let audioFileId: String?
    let categoryId: String?
    let startSeconds: Double?
    let endSeconds: Double?
    let noteText: String?
    let entryType: String?
    let sourceText: String?
    let createdAt: Double
    let updatedAt: Double
    let audioFile: BookNoteAudioFile?
    let category: BookNoteCategorySummary?
    let tags: [MemoryTag]?

    var id: String { _id }

    var displayTitle: String {
        if let audioFile {
            if let partNumber = audioFile.partNumberInt {
                return "Part \(partNumber)"
            }
            return audioFile.displayName
        }
        return entryTypeLabel
    }
}

// MARK: - Cross-Book Note Types

struct CrossBookNoteSummary: Decodable, Hashable, Sendable {
    let _id: String
    let title: String
    let coverImageR2Key: String?
    let primaryAuthorName: String?
}

struct CrossBookNote: Decodable, Identifiable, Hashable, Sendable, NoteEntryDisplayable {
    let _id: String
    let _creationTime: Double
    let userId: String
    let bookId: String
    let audioFileId: String?
    let categoryId: String?
    let startSeconds: Double?
    let endSeconds: Double?
    let noteText: String?
    let entryType: String?
    let sourceText: String?
    let createdAt: Double
    let updatedAt: Double
    let audioFile: BookNoteAudioFile?
    let tags: [MemoryTag]?
    let book: CrossBookNoteSummary

    var id: String { _id }

    /// Convert to a BookNote for passing to sheets that expect BookNote.
    /// Category is intentionally nil — the cross-book query omits legacy category enrichment.
    var asBookNote: BookNote {
        BookNote(
            _id: _id,
            _creationTime: _creationTime,
            userId: userId,
            bookId: bookId,
            audioFileId: audioFileId,
            categoryId: categoryId,
            startSeconds: startSeconds,
            endSeconds: endSeconds,
            noteText: noteText,
            entryType: entryType,
            sourceText: sourceText,
            createdAt: createdAt,
            updatedAt: updatedAt,
            audioFile: audioFile,
            category: nil,
            tags: tags
        )
    }
}
