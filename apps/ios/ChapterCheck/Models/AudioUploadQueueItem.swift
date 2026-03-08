import Foundation

enum AudioUploadStatus: Equatable {
    case pending
    case uploading
    case uploaded
    case failed
}

struct AudioUploadQueueItem: Identifiable, Equatable {
    let id: UUID
    let fileURL: URL
    let fileName: String
    let fileSize: Int64
    let contentType: String
    let hasSecurityScopedAccess: Bool
    var partNumber: Int
    var chapterNumberText: String
    var chapterTitle: String
    var duration: Double
    var progress: Double
    var status: AudioUploadStatus
    var errorMessage: String?

    init(
        id: UUID = UUID(),
        fileURL: URL,
        fileName: String,
        fileSize: Int64,
        contentType: String,
        hasSecurityScopedAccess: Bool,
        partNumber: Int,
        chapterNumberText: String = "",
        chapterTitle: String = "",
        duration: Double = 0,
        progress: Double = 0,
        status: AudioUploadStatus = .pending,
        errorMessage: String? = nil
    ) {
        self.id = id
        self.fileURL = fileURL
        self.fileName = fileName
        self.fileSize = fileSize
        self.contentType = contentType
        self.hasSecurityScopedAccess = hasSecurityScopedAccess
        self.partNumber = partNumber
        self.chapterNumberText = chapterNumberText
        self.chapterTitle = chapterTitle
        self.duration = duration
        self.progress = progress
        self.status = status
        self.errorMessage = errorMessage
    }

    var format: String {
        fileURL.pathExtension.lowercased().isEmpty ? "unknown" : fileURL.pathExtension.lowercased()
    }

    var chapterNumber: Int? {
        Int(chapterNumberText.trimmingCharacters(in: .whitespacesAndNewlines))
    }

    var formattedFileSize: String {
        ByteCountFormatter.string(fromByteCount: fileSize, countStyle: .file)
    }

    var formattedDuration: String {
        guard duration > 0 else { return "Unknown duration" }
        return TimeFormatting.formatDuration(duration)
    }
}
