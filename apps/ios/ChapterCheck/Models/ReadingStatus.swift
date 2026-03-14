import SwiftUI

/// Five-state reading status model matching the Convex `bookUserData.status` field.
///
/// Raw values correspond to the backend `BOOK_STATUS_VALUES` constant so they
/// can be sent directly to the `setReadingStatus` mutation.
enum ReadingStatus: String, Codable, CaseIterable, Identifiable {
    case wantToRead = "want_to_read"
    case reading
    case finished
    case paused
    case dnf

    var id: String { rawValue }

    var label: String {
        switch self {
        case .wantToRead: return "Want to Read"
        case .reading: return "Reading"
        case .finished: return "Finished"
        case .paused: return "Paused"
        case .dnf: return "Did Not Finish"
        }
    }

    var icon: String {
        switch self {
        case .wantToRead: return "bookmark"
        case .reading: return "book.fill"
        case .finished: return "checkmark.circle.fill"
        case .paused: return "pause.circle.fill"
        case .dnf: return "xmark.circle.fill"
        }
    }

    var color: Color {
        switch self {
        case .wantToRead: return .blue
        case .reading: return .orange
        case .finished: return .green
        case .paused: return .yellow
        case .dnf: return .red
        }
    }

    /// Initialize from a raw status string, falling back to legacy `isRead` if status is nil.
    init?(statusString: String?, isRead: Bool?) {
        if let statusString, let status = ReadingStatus(rawValue: statusString) {
            self = status
            return
        }
        // Legacy fallback
        if isRead == true {
            self = .finished
            return
        }
        return nil
    }
}
