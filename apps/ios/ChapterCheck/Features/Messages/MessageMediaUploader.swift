import AVFoundation
import Foundation
import UIKit

/// Handles photo compression, video validation/transcoding, thumbnail generation,
/// and presigned URL upload for message media.
actor MessageMediaUploader {

    private let repository = MessagingRepository()

    // MARK: - Photo Upload

    /// Compress and upload a photo. Returns the R2 key and dimensions.
    func uploadPhoto(
        image: UIImage,
        conversationId: String,
        onProgress: @escaping @MainActor (Double) -> Void
    ) async throws -> (r2Key: String, width: Double, height: Double, sizeBytes: Int) {
        // Downscale to 2048px longest side, JPEG quality 0.8
        let compressed = compressToJPEG(image, maxDimension: 2048, quality: 0.8)
        let fileName = "photo_\(Int(Date().timeIntervalSince1970)).jpg"

        // Get presigned upload URL
        let upload = try await repository.generateMediaUploadUrl(
            conversationId: conversationId,
            fileName: fileName,
            fileSize: compressed.count,
            contentType: "image/jpeg"
        )

        // Upload via presigned URL
        try await uploadData(compressed, to: upload.uploadUrl, contentType: "image/jpeg", onProgress: onProgress)

        return (
            r2Key: upload.r2Key,
            width: Double(image.size.width),
            height: Double(image.size.height),
            sizeBytes: compressed.count
        )
    }

    // MARK: - Video Upload

    /// Validate, optionally transcode, and upload a video. Returns R2 keys for video + thumbnail.
    func uploadVideo(
        url: URL,
        conversationId: String,
        onProgress: @escaping @MainActor (Double) -> Void
    ) async throws -> (videoR2Key: String, thumbnailR2Key: String, width: Double, height: Double, sizeBytes: Int, durationSeconds: Double) {
        let asset = AVURLAsset(url: url)

        // Validate duration
        let duration = try await asset.load(.duration)
        let durationSeconds = CMTimeGetSeconds(duration)
        guard durationSeconds <= 30 else {
            throw MediaError.videoTooLong
        }

        // Get video dimensions
        guard let track = try await asset.loadTracks(withMediaType: .video).first else {
            throw MediaError.noVideoTrack
        }
        let size = try await track.load(.naturalSize)
        let transform = try await track.load(.preferredTransform)
        let transformedSize = size.applying(transform)
        let width = abs(transformedSize.width)
        let height = abs(transformedSize.height)

        // Transcode to H.264 MP4 if needed
        let videoURL = try await transcodeIfNeeded(asset: asset, sourceURL: url)

        // Validate file size
        let fileAttributes = try FileManager.default.attributesOfItem(atPath: videoURL.path)
        let fileSize = fileAttributes[.size] as? Int ?? 0
        guard fileSize <= 25 * 1024 * 1024 else {
            throw MediaError.videoTooLarge
        }

        // Generate thumbnail
        let thumbnail = try await generateThumbnail(asset: asset)
        let thumbnailData = compressToJPEG(thumbnail, maxDimension: 512, quality: 0.7)

        // Upload thumbnail
        let thumbnailFileName = "thumb_\(Int(Date().timeIntervalSince1970)).jpg"
        let thumbnailUpload = try await repository.generateMediaUploadUrl(
            conversationId: conversationId,
            fileName: thumbnailFileName,
            fileSize: thumbnailData.count,
            contentType: "image/jpeg"
        )
        try await uploadData(thumbnailData, to: thumbnailUpload.uploadUrl, contentType: "image/jpeg", onProgress: { _ in })

        // Upload video
        let videoFileName = "video_\(Int(Date().timeIntervalSince1970)).mp4"
        let videoUpload = try await repository.generateMediaUploadUrl(
            conversationId: conversationId,
            fileName: videoFileName,
            fileSize: fileSize,
            contentType: "video/mp4"
        )
        try await uploadFile(at: videoURL, to: videoUpload.uploadUrl, contentType: "video/mp4", onProgress: onProgress)

        // Clean up temp file if we transcoded
        if videoURL != url {
            try? FileManager.default.removeItem(at: videoURL)
        }

        return (
            videoR2Key: videoUpload.r2Key,
            thumbnailR2Key: thumbnailUpload.r2Key,
            width: Double(width),
            height: Double(height),
            sizeBytes: fileSize,
            durationSeconds: durationSeconds
        )
    }

    // MARK: - Photo Compression

    private func compressToJPEG(_ image: UIImage, maxDimension: CGFloat, quality: CGFloat) -> Data {
        let size = image.size
        let fallback = image.jpegData(compressionQuality: quality) ?? Data()

        if size.width > maxDimension || size.height > maxDimension {
            let scale = maxDimension / max(size.width, size.height)
            let newSize = CGSize(width: size.width * scale, height: size.height * scale)
            let renderer = UIGraphicsImageRenderer(size: newSize)
            let resized = renderer.image { _ in
                image.draw(in: CGRect(origin: .zero, size: newSize))
            }
            return resized.jpegData(compressionQuality: quality) ?? fallback
        }

        return fallback
    }

    // MARK: - Video Transcoding

    private func transcodeIfNeeded(asset: AVURLAsset, sourceURL: URL) async throws -> URL {
        // Check if already H.264 MP4
        guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
            throw MediaError.noVideoTrack
        }

        let formatDescriptions = try await videoTrack.load(.formatDescriptions)
        let isH264 = formatDescriptions.contains { desc in
            let mediaSubType = CMFormatDescriptionGetMediaSubType(desc)
            return mediaSubType == kCMVideoCodec_H264
        }

        if isH264 && sourceURL.pathExtension.lowercased() == "mp4" {
            return sourceURL
        }

        // Transcode to H.264 MP4
        let outputURL = FileManager.default.temporaryDirectory.appendingPathComponent(
            "transcode_\(UUID().uuidString).mp4"
        )

        guard let exportSession = AVAssetExportSession(asset: asset, presetName: AVAssetExportPresetHighestQuality) else {
            throw MediaError.transcodeFailed
        }

        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mp4

        await exportSession.export()

        guard exportSession.status == .completed else {
            throw MediaError.transcodeFailed
        }

        return outputURL
    }

    // MARK: - Thumbnail Generation

    private func generateThumbnail(asset: AVURLAsset) async throws -> UIImage {
        let generator = AVAssetImageGenerator(asset: asset)
        generator.appliesPreferredTrackTransform = true
        generator.maximumSize = CGSize(width: 512, height: 512)

        let (cgImage, _) = try await generator.image(at: .zero)
        return UIImage(cgImage: cgImage)
    }

    // MARK: - Upload Helpers

    private func uploadData(
        _ data: Data,
        to uploadUrl: String,
        contentType: String,
        onProgress: @escaping @MainActor (Double) -> Void
    ) async throws {
        guard let url = URL(string: uploadUrl) else {
            throw MediaError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")

        let (_, response) = try await URLSession.shared.upload(for: request, from: data)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw MediaError.uploadFailed
        }
        await onProgress(1.0)
    }

    private func uploadFile(
        at fileURL: URL,
        to uploadUrl: String,
        contentType: String,
        onProgress: @escaping @MainActor (Double) -> Void
    ) async throws {
        guard let url = URL(string: uploadUrl) else {
            throw MediaError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")

        let (_, response) = try await URLSession.shared.upload(for: request, fromFile: fileURL)
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw MediaError.uploadFailed
        }
        await onProgress(1.0)
    }
}

// MARK: - Errors

enum MediaError: LocalizedError {
    case videoTooLong
    case videoTooLarge
    case noVideoTrack
    case transcodeFailed
    case invalidURL
    case uploadFailed

    var errorDescription: String? {
        switch self {
        case .videoTooLong: "Video must be 30 seconds or shorter."
        case .videoTooLarge: "Video must be 25 MB or smaller."
        case .noVideoTrack: "Could not read video."
        case .transcodeFailed: "Could not process video."
        case .invalidURL: "Upload URL is invalid."
        case .uploadFailed: "Upload failed. Please try again."
        }
    }
}
