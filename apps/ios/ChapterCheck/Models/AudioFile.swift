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
