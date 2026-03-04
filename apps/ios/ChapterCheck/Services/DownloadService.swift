import Foundation
import os

/// Actor handling file I/O, URLSession downloads, and manifest persistence.
///
/// Follows the same actor pattern as `StreamURLCache` for thread-safe state.
/// Downloads audio files to `Documents/Downloads/{bookId}/{audioFileId}.{ext}`
/// and persists a JSON manifest tracking all downloaded files.
actor DownloadService {

    private let audioRepository: AudioRepository
    private let logger = Logger(subsystem: "com.chaptercheck", category: "DownloadService")

    private var manifest: DownloadManifest
    private var activeTasks: [String: Task<Void, Never>] = [:]

    /// Root directory for all downloads.
    private static var downloadsDirectory: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("Downloads", isDirectory: true)
    }

    private static var manifestURL: URL {
        downloadsDirectory.appendingPathComponent("manifest.json")
    }

    init(audioRepository: AudioRepository) {
        self.audioRepository = audioRepository
        self.manifest = DownloadManifest()
    }

    // MARK: - Initialization

    /// Load the manifest from disk and reset any interrupted downloads.
    func loadManifest() -> DownloadManifest {
        let fm = FileManager.default
        let dir = Self.downloadsDirectory

        // Ensure downloads directory exists
        if !fm.fileExists(atPath: dir.path) {
            try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
            excludeFromBackup(dir)
        }

        // Load existing manifest
        let url = Self.manifestURL
        if fm.fileExists(atPath: url.path),
           let data = try? Data(contentsOf: url),
           let loaded = try? JSONDecoder().decode(DownloadManifest.self, from: data)
        {
            manifest = loaded
        }

        // Reset interrupted downloads (app was killed during download)
        for (id, var file) in manifest.files {
            if file.status == .downloading || file.status == .pending {
                file.status = .failed
                file.errorMessage = "Download interrupted"
                manifest.files[id] = file
            }
        }

        saveManifestToDisk()
        return manifest
    }

    // MARK: - Queries

    /// Get the local file URL for a downloaded audio file, if it exists and is complete.
    func localFileURL(for audioFileId: String) -> URL? {
        guard let file = manifest.files[audioFileId],
              file.status == .completed else { return nil }

        let url = Self.downloadsDirectory.appendingPathComponent(file.localRelativePath)
        guard FileManager.default.fileExists(atPath: url.path) else {
            // File was deleted externally — clean up manifest
            manifest.files.removeValue(forKey: audioFileId)
            saveManifestToDisk()
            return nil
        }
        return url
    }

    /// Get all downloaded files from the manifest.
    func allDownloadedFiles() -> [String: DownloadedFile] {
        manifest.files
    }

    /// Get book metadata from the manifest.
    func allBookMetadata() -> [String: BookMetadataEntry] {
        manifest.bookMetadata
    }

    /// Get audio file metadata from the manifest.
    func allAudioFileMetadata() -> [String: AudioFileMetadataEntry] {
        manifest.audioFileMetadata
    }

    /// Store audio file metadata entries in the manifest for offline playback.
    func storeAudioFileMetadata(_ entries: [AudioFileMetadataEntry]) {
        for entry in entries {
            manifest.audioFileMetadata[entry.audioFileId] = entry
        }
        saveManifestToDisk()
    }

    /// Total storage used by all downloaded files.
    func totalStorageUsed() -> Int64 {
        manifest.files.values
            .filter { $0.status == .completed }
            .reduce(0) { $0 + $1.fileSize }
    }

    // MARK: - Download

    /// Download a single audio file, reporting progress via an AsyncStream.
    ///
    /// - Parameters:
    ///   - audioFile: The audio file metadata.
    ///   - bookId: The book this file belongs to.
    ///   - bookMetadata: Lightweight book info for offline display.
    /// - Returns: An `AsyncStream` of `(bytesDownloaded, totalBytes)` tuples.
    func downloadFile(
        audioFileId: String,
        bookId: String,
        fileName: String,
        fileSize: Int64,
        bookMetadata: BookMetadataEntry
    ) -> AsyncStream<(Int64, Int64)> {
        // Store book metadata
        manifest.bookMetadata[bookId] = bookMetadata

        // Determine file extension
        let ext = (fileName as NSString).pathExtension.isEmpty
            ? "m4a"
            : (fileName as NSString).pathExtension

        let relativePath = "\(bookId)/\(audioFileId).\(ext)"

        // Create the download record
        let downloadedFile = DownloadedFile(
            audioFileId: audioFileId,
            bookId: bookId,
            fileName: fileName,
            fileSize: fileSize,
            localRelativePath: relativePath,
            status: .pending,
            bytesDownloaded: 0,
            downloadedAt: nil,
            errorMessage: nil
        )
        manifest.files[audioFileId] = downloadedFile
        saveManifestToDisk()

        return AsyncStream { continuation in
            let task = Task { [weak self] in
                guard let self else {
                    continuation.finish()
                    return
                }
                await self.performDownload(
                    audioFileId: audioFileId,
                    bookId: bookId,
                    relativePath: relativePath,
                    fileSize: fileSize,
                    continuation: continuation
                )
            }
            activeTasks[audioFileId] = task

            continuation.onTermination = { [weak self] _ in
                Task { [weak self] in
                    await self?.removeActiveTask(audioFileId)
                }
            }
        }
    }

    /// Cancel an active download for a specific audio file.
    func cancelDownload(audioFileId: String) {
        activeTasks[audioFileId]?.cancel()
        activeTasks.removeValue(forKey: audioFileId)

        if var file = manifest.files[audioFileId] {
            file.status = .failed
            file.errorMessage = "Cancelled"
            manifest.files[audioFileId] = file
            saveManifestToDisk()

            // Clean up partial file
            let url = Self.downloadsDirectory.appendingPathComponent(file.localRelativePath)
            try? FileManager.default.removeItem(at: url)
        }
    }

    /// Delete all downloaded files for a book.
    func deleteBookDownloads(bookId: String) {
        // Remove file records
        let fileIds = manifest.files.values
            .filter { $0.bookId == bookId }
            .map(\.audioFileId)

        for id in fileIds {
            activeTasks[id]?.cancel()
            activeTasks.removeValue(forKey: id)
            manifest.files.removeValue(forKey: id)
            manifest.audioFileMetadata.removeValue(forKey: id)
        }

        // Remove book metadata
        manifest.bookMetadata.removeValue(forKey: bookId)

        // Delete the book's download directory
        let bookDir = Self.downloadsDirectory.appendingPathComponent(bookId, isDirectory: true)
        try? FileManager.default.removeItem(at: bookDir)

        saveManifestToDisk()
    }

    /// Delete all downloads.
    func deleteAllDownloads() {
        // Cancel all active tasks
        for task in activeTasks.values {
            task.cancel()
        }
        activeTasks.removeAll()

        // Clear manifest
        manifest = DownloadManifest()
        saveManifestToDisk()

        // Remove entire downloads directory contents (keep the directory itself)
        let fm = FileManager.default
        let dir = Self.downloadsDirectory
        if let contents = try? fm.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) {
            for item in contents where item.lastPathComponent != "manifest.json" {
                try? fm.removeItem(at: item)
            }
        }
    }

    // MARK: - Private

    private func removeActiveTask(_ audioFileId: String) {
        activeTasks.removeValue(forKey: audioFileId)
    }

    private func performDownload(
        audioFileId: String,
        bookId: String,
        relativePath: String,
        fileSize: Int64,
        continuation: AsyncStream<(Int64, Int64)>.Continuation
    ) async {
        // Update status to downloading
        manifest.files[audioFileId]?.status = .downloading
        saveManifestToDisk()

        do {
            // Get presigned URL from Convex
            let urlString = try await audioRepository.generateStreamUrl(audioFileId: audioFileId)
            guard let url = URL(string: urlString) else {
                throw URLError(.badURL)
            }

            // Ensure book directory exists
            let bookDir = Self.downloadsDirectory.appendingPathComponent(bookId, isDirectory: true)
            try FileManager.default.createDirectory(at: bookDir, withIntermediateDirectories: true)

            // Download using streaming bytes
            let localURL = Self.downloadsDirectory.appendingPathComponent(relativePath)
            let (bytes, response) = try await URLSession.shared.bytes(for: URLRequest(url: url))

            let totalBytes = (response as? HTTPURLResponse)
                .flatMap { Int64($0.value(forHTTPHeaderField: "Content-Length") ?? "") }
                ?? fileSize

            guard let outputStream = OutputStream(url: localURL, append: false) else {
                throw URLError(.cannotCreateFile)
            }
            outputStream.open()
            defer { outputStream.close() }

            let bufferSize = 65_536 // 64KB chunks
            var buffer = [UInt8]()
            buffer.reserveCapacity(bufferSize)
            var bytesDownloaded: Int64 = 0

            for try await byte in bytes {
                try Task.checkCancellation()

                buffer.append(byte)

                if buffer.count >= bufferSize {
                    let written = buffer.withUnsafeBufferPointer { ptr -> Int in
                        guard let base = ptr.baseAddress else { return 0 }
                        return outputStream.write(base, maxLength: ptr.count)
                    }
                    guard written > 0 else { throw URLError(.cannotWriteToFile) }
                    bytesDownloaded += Int64(written)
                    buffer.removeAll(keepingCapacity: true)

                    // Update manifest and report progress
                    manifest.files[audioFileId]?.bytesDownloaded = bytesDownloaded
                    continuation.yield((bytesDownloaded, totalBytes))
                }
            }

            // Flush remaining bytes
            if !buffer.isEmpty {
                let written = buffer.withUnsafeBufferPointer { ptr -> Int in
                    guard let base = ptr.baseAddress else { return 0 }
                    return outputStream.write(base, maxLength: ptr.count)
                }
                guard written > 0 else { throw URLError(.cannotWriteToFile) }
                bytesDownloaded += Int64(written)
                continuation.yield((bytesDownloaded, totalBytes))
            }

            // Verify downloaded size matches expected
            let expectedSize = manifest.files[audioFileId]?.fileSize ?? 0
            if expectedSize > 0 && bytesDownloaded != expectedSize {
                logger.warning("Size mismatch for '\(audioFileId)': expected \(expectedSize), got \(bytesDownloaded)")
            }

            // Mark completed
            manifest.files[audioFileId]?.status = .completed
            manifest.files[audioFileId]?.bytesDownloaded = bytesDownloaded
            manifest.files[audioFileId]?.downloadedAt = Date()
            manifest.files[audioFileId]?.errorMessage = nil
            saveManifestToDisk()

            logger.info("Downloaded '\(audioFileId)' (\(bytesDownloaded) bytes)")
            continuation.finish()

        } catch is CancellationError {
            logger.info("Download cancelled for '\(audioFileId)'")
            continuation.finish()
        } catch {
            manifest.files[audioFileId]?.status = .failed
            manifest.files[audioFileId]?.errorMessage = error.localizedDescription
            saveManifestToDisk()

            logger.error("Download failed for '\(audioFileId)': \(error.localizedDescription)")
            continuation.finish()
        }

        // Always clean up the active task reference when done
        activeTasks.removeValue(forKey: audioFileId)
    }

    private func saveManifestToDisk() {
        do {
            let data = try JSONEncoder().encode(manifest)
            try data.write(to: Self.manifestURL, options: .atomic)
        } catch {
            logger.error("Failed to save manifest: \(error.localizedDescription)")
        }
    }

    private func excludeFromBackup(_ url: URL) {
        var url = url
        var values = URLResourceValues()
        values.isExcludedFromBackup = true
        try? url.setResourceValues(values)
    }
}
