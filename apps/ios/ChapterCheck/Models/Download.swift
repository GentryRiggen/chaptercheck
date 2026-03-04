import Foundation

// MARK: - Download Status

/// Status of a single audio file download.
enum DownloadStatus: String, Codable, Sendable {
    case pending
    case downloading
    case completed
    case failed
}

// MARK: - Downloaded File

/// Persisted record of a single downloaded audio file.
struct DownloadedFile: Codable, Sendable {
    let audioFileId: String
    let bookId: String
    let fileName: String
    let fileSize: Int64
    let localRelativePath: String
    var status: DownloadStatus
    var bytesDownloaded: Int64
    var downloadedAt: Date?
    var errorMessage: String?

    var progress: Double {
        guard fileSize > 0 else { return 0 }
        return Double(bytesDownloaded) / Double(fileSize)
    }

    var isComplete: Bool {
        status == .completed
    }
}

// MARK: - Book Metadata Entry

/// Lightweight book info stored in the manifest for offline display.
struct BookMetadataEntry: Codable, Sendable {
    let bookId: String
    let title: String
    let authorNames: [String]
    let coverImageR2Key: String?
}

// MARK: - Audio File Metadata Entry

/// Audio file metadata stored in the manifest for offline playback.
struct AudioFileMetadataEntry: Codable, Sendable {
    let audioFileId: String
    let bookId: String
    let fileName: String
    let fileSize: Double
    let duration: Double
    let format: String
    let partNumber: Double?
    let displayName: String?
}

// MARK: - Download Manifest

/// JSON-serialized manifest tracking all downloaded files.
struct DownloadManifest: Codable, Sendable {
    var files: [String: DownloadedFile]
    var bookMetadata: [String: BookMetadataEntry]
    var audioFileMetadata: [String: AudioFileMetadataEntry]

    init() {
        self.files = [:]
        self.bookMetadata = [:]
        self.audioFileMetadata = [:]
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        files = try container.decode([String: DownloadedFile].self, forKey: .files)
        bookMetadata = try container.decode([String: BookMetadataEntry].self, forKey: .bookMetadata)
        audioFileMetadata = try container.decodeIfPresent([String: AudioFileMetadataEntry].self, forKey: .audioFileMetadata) ?? [:]
    }
}

// MARK: - Book Download State

/// Aggregate download state for a book, used by UI components.
enum BookDownloadState {
    case none
    case downloading
    case complete
    case partial
}

// MARK: - Book Download Info

/// Aggregated view of a book's downloads for display in the downloads list.
struct BookDownloadInfo: Identifiable {
    let bookId: String
    let bookTitle: String
    let authorNames: [String]
    let coverImageR2Key: String?
    let files: [DownloadedFile]
    let audioFileMetadata: [AudioFileMetadataEntry]

    var id: String { bookId }

    var isComplete: Bool {
        !files.isEmpty && files.allSatisfy(\.isComplete)
    }

    var isDownloading: Bool {
        files.contains { $0.status == .downloading || $0.status == .pending }
    }

    var progress: Double {
        let activeFiles = files.filter { $0.status != .failed }
        guard !activeFiles.isEmpty else { return 0 }
        let totalSize = activeFiles.reduce(Int64(0)) { $0 + $1.fileSize }
        let totalDownloaded = activeFiles.reduce(Int64(0)) { $0 + $1.bytesDownloaded }
        guard totalSize > 0 else { return 0 }
        return Double(totalDownloaded) / Double(totalSize)
    }

    var totalSize: Int64 {
        files.reduce(0) { $0 + $1.fileSize }
    }

    var formattedSize: String {
        ByteCountFormatter.string(fromByteCount: totalSize, countStyle: .file)
    }

    var state: BookDownloadState {
        if files.isEmpty { return .none }
        if isDownloading { return .downloading }
        if isComplete { return .complete }
        return .partial
    }
}
