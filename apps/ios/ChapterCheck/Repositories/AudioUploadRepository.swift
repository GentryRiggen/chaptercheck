import AVFoundation
import ConvexMobile
import Foundation

@MainActor
final class AudioUploadRepository {

    private struct UploadUrlResponse: Decodable {
        let uploadUrl: String
        let r2Key: String
        let r2Bucket: String
        let storageAccountId: String
    }

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    func uploadAudioFile(
        bookId: String,
        item: AudioUploadQueueItem,
        onProgress: @escaping @MainActor (Double) -> Void
    ) async throws {
        let upload: UploadUrlResponse = try await convex.action(
            "audioFiles/actions:generateUploadUrl",
            with: [
                "bookId": bookId,
                "fileName": item.fileName,
                "fileSize": Double(item.fileSize),
                "contentType": item.contentType,
            ]
        )

        try await PresignedAudioUploader.uploadFile(
            at: item.fileURL,
            to: upload.uploadUrl,
            contentType: item.contentType,
            onProgress: onProgress
        )

        var args: [String: ConvexEncodable?] = [
            "bookId": bookId,
            "fileName": item.fileName,
            "fileSize": Double(item.fileSize),
            "duration": item.duration,
            "format": item.format,
            "r2Key": upload.r2Key,
            "r2Bucket": upload.r2Bucket,
            "storageAccountId": upload.storageAccountId,
            "partNumber": Double(item.partNumber),
        ]

        if let chapterNumber = item.chapterNumber {
            args["chapterNumber"] = Double(chapterNumber)
        }

        let chapterTitle = item.chapterTitle.trimmingCharacters(in: .whitespacesAndNewlines)
        if !chapterTitle.isEmpty {
            args["chapterTitle"] = chapterTitle
        }

        try await convex.mutation("audioFiles/mutations:createAudioFile", with: args)
    }

    func extractDuration(from fileURL: URL) async -> Double {
        let asset = AVURLAsset(url: fileURL)

        do {
            let duration = try await asset.load(.duration)
            let seconds = duration.seconds
            guard seconds.isFinite, seconds > 0 else { return 0 }
            return seconds
        } catch {
            return 0
        }
    }
}

private enum PresignedAudioUploader {

    static func uploadFile(
        at fileURL: URL,
        to uploadUrl: String,
        contentType: String,
        onProgress: @escaping @MainActor (Double) -> Void
    ) async throws {
        guard let url = URL(string: uploadUrl) else {
            throw UploadError.invalidURL
        }

        let delegate = UploadDelegate(onProgress: onProgress)
        let session = URLSession(configuration: .ephemeral, delegate: delegate, delegateQueue: nil)

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")

        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            delegate.continuation = continuation
            let task = session.uploadTask(with: request, fromFile: fileURL)
            task.resume()
        }
    }

    private final class UploadDelegate: NSObject, URLSessionTaskDelegate {
        let onProgress: @MainActor (Double) -> Void
        var continuation: CheckedContinuation<Void, Error>?

        init(onProgress: @escaping @MainActor (Double) -> Void) {
            self.onProgress = onProgress
        }

        func urlSession(
            _ session: URLSession,
            task: URLSessionTask,
            didSendBodyData bytesSent: Int64,
            totalBytesSent: Int64,
            totalBytesExpectedToSend: Int64
        ) {
            guard totalBytesExpectedToSend > 0 else { return }
            let progress = min(max(Double(totalBytesSent) / Double(totalBytesExpectedToSend), 0), 1)
            Task { @MainActor in
                onProgress(progress)
            }
        }

        func urlSession(_ session: URLSession, task: URLSessionTask, didCompleteWithError error: Error?) {
            defer {
                continuation = nil
                session.finishTasksAndInvalidate()
            }

            if let error {
                continuation?.resume(throwing: error)
                return
            }

            guard let response = task.response as? HTTPURLResponse else {
                continuation?.resume(throwing: UploadError.invalidResponse)
                return
            }

            guard (200..<300).contains(response.statusCode) else {
                continuation?.resume(throwing: UploadError.httpStatus(response.statusCode))
                return
            }

            continuation?.resume()
        }
    }

    private enum UploadError: LocalizedError {
        case invalidURL
        case invalidResponse
        case httpStatus(Int)

        var errorDescription: String? {
            switch self {
            case .invalidURL:
                return "Invalid upload URL"
            case .invalidResponse:
                return "Upload response was invalid"
            case .httpStatus(let code):
                return "Upload failed with status \(code)"
            }
        }
    }
}
