import Foundation

/// An audio file with friendly display names.
/// Matches the shape returned by `audioFiles:getAudioFilesForBook` and
/// `audioFiles:getMyAudioFiles`.
struct AudioFile: Decodable, Identifiable, Hashable, Sendable {
    let _id: String
    let _creationTime: Double
    let bookId: String
    let fileName: String
    let fileSize: Double
    let duration: Double
    let format: String
    let bitrate: String?
    let r2Key: String
    let r2Bucket: String
    let storageAccountId: String?
    let uploadedBy: String
    let uploadedAt: Double
    let partNumber: Double?
    let chapterNumber: Double?
    let chapterTitle: String?
    let friendlyName: String?
    let displayName: String?

    var id: String { _id }

    init(
        _id: String,
        _creationTime: Double,
        bookId: String,
        fileName: String,
        fileSize: Double,
        duration: Double,
        format: String,
        bitrate: String? = nil,
        r2Key: String,
        r2Bucket: String,
        storageAccountId: String? = nil,
        uploadedBy: String,
        uploadedAt: Double,
        partNumber: Double? = nil,
        chapterNumber: Double? = nil,
        chapterTitle: String? = nil,
        friendlyName: String? = nil,
        displayName: String? = nil
    ) {
        self._id = _id
        self._creationTime = _creationTime
        self.bookId = bookId
        self.fileName = fileName
        self.fileSize = fileSize
        self.duration = duration
        self.format = format
        self.bitrate = bitrate
        self.r2Key = r2Key
        self.r2Bucket = r2Bucket
        self.storageAccountId = storageAccountId
        self.uploadedBy = uploadedBy
        self.uploadedAt = uploadedAt
        self.partNumber = partNumber
        self.chapterNumber = chapterNumber
        self.chapterTitle = chapterTitle
        self.friendlyName = friendlyName
        self.displayName = displayName
    }

    var partNumberInt: Int { Int(partNumber ?? 1) }
    var fileSizeBytes: Int { Int(fileSize) }
    var durationSeconds: Int { Int(duration) }

    /// File size formatted as "X.X MB"
    var formattedFileSize: String {
        let mb = fileSize / (1024 * 1024)
        if mb >= 1024 {
            return String(format: "%.1f GB", mb / 1024)
        }
        return String(format: "%.1f MB", mb)
    }

    /// Duration formatted as "Xh Ym" or "Xm Ys"
    var formattedDuration: String {
        let totalSeconds = Int(duration)
        let hours = totalSeconds / 3600
        let minutes = (totalSeconds % 3600) / 60
        let seconds = totalSeconds % 60
        if hours > 0 {
            return "\(hours)h \(minutes)m"
        }
        if minutes > 0 {
            return "\(minutes)m \(seconds)s"
        }
        return "\(seconds)s"
    }
}
