import Foundation
import os

/// Observable manager for download state, injected via `.environment()`.
///
/// Parallel to `AudioPlayerManager` — owns published state that views observe,
/// and delegates actual file operations to `DownloadService` (an actor).
@Observable
@MainActor
final class DownloadManager {

    // MARK: - Published State

    /// Per-file download progress (0.0 to 1.0), keyed by audio file ID.
    private(set) var fileProgress: [String: Double] = [:]

    /// Per-file download status, keyed by audio file ID.
    private(set) var fileStatuses: [String: DownloadStatus] = [:]

    /// Set of book IDs that are fully downloaded.
    private(set) var downloadedBookIds: Set<String> = []

    /// Set of book IDs with active downloads.
    private(set) var activeBookIds: Set<String> = []

    /// Total storage used by completed downloads.
    private(set) var totalStorageUsed: Int64 = 0

    /// All downloaded books with their file info.
    private(set) var downloadedBooks: [BookDownloadInfo] = []

    // MARK: - Dependencies

    private let downloadService: DownloadService
    private let logger = Logger(subsystem: "com.chaptercheck", category: "DownloadManager")

    /// Active download tasks per book, so we can cancel them.
    private var bookDownloadTasks: [String: Task<Void, Never>] = [:]

    init() {
        self.downloadService = DownloadService(audioRepository: AudioRepository())
    }

    // MARK: - Initialization

    /// Load the manifest and hydrate observable state. Call once from `MainTabView.task`.
    func initialize() async {
        let manifest = await downloadService.loadManifest()
        hydrateState(from: manifest)
    }

    // MARK: - Download Book

    /// Download all audio files for a book sequentially.
    ///
    /// - Parameters:
    ///   - book: The book to download.
    ///   - audioFiles: All audio file parts for the book.
    func downloadBook(book: BookWithDetails, audioFiles: [AudioFile]) {
        let bookId = book._id
        guard bookDownloadTasks[bookId] == nil else { return } // Already downloading

        // Check available disk space before starting
        let totalBytes = audioFiles.reduce(Int64(0)) { $0 + Int64($1.fileSize) }
        if let available = availableDiskSpace(), totalBytes > available {
            logger.warning("Insufficient disk space: need \(totalBytes), have \(available)")
            return
        }

        activeBookIds.insert(bookId)

        // Set initial statuses
        for file in audioFiles {
            fileStatuses[file._id] = .pending
            fileProgress[file._id] = 0
        }

        let metadata = BookMetadataEntry(
            bookId: bookId,
            title: book.title,
            authorNames: book.authors.map(\.name),
            coverImageR2Key: book.coverImageR2Key
        )

        let task = Task { [weak self] in
            guard let self else { return }

            for audioFile in audioFiles {
                guard !Task.isCancelled else { break }

                await MainActor.run {
                    self.fileStatuses[audioFile._id] = .downloading
                }

                let stream = await self.downloadService.downloadFile(
                    audioFileId: audioFile._id,
                    bookId: bookId,
                    fileName: audioFile.fileName,
                    fileSize: Int64(audioFile.fileSize),
                    bookMetadata: metadata
                )

                for await (downloaded, total) in stream {
                    guard !Task.isCancelled else { break }
                    let progress = total > 0 ? Double(downloaded) / Double(total) : 0
                    await MainActor.run {
                        self.fileProgress[audioFile._id] = progress
                    }
                }

                // Update status from manifest after download completes
                let files = await self.downloadService.allDownloadedFiles()
                if let file = files[audioFile._id] {
                    await MainActor.run {
                        self.fileStatuses[audioFile._id] = file.status
                        if file.status == .completed {
                            self.fileProgress[audioFile._id] = 1.0
                        }
                    }
                }
            }

            // Refresh all state after book download completes
            await self.refreshState()

            await MainActor.run {
                self.activeBookIds.remove(bookId)
                self.bookDownloadTasks.removeValue(forKey: bookId)
            }
        }

        bookDownloadTasks[bookId] = task
    }

    // MARK: - Cancel / Delete

    /// Cancel an active book download.
    func cancelBookDownload(bookId: String) {
        bookDownloadTasks[bookId]?.cancel()
        bookDownloadTasks.removeValue(forKey: bookId)
        activeBookIds.remove(bookId)

        Task {
            await downloadService.deleteBookDownloads(bookId: bookId)
            await refreshState()
        }
    }

    /// Delete a completed book download.
    func deleteBookDownload(bookId: String) {
        Task {
            await downloadService.deleteBookDownloads(bookId: bookId)
            await refreshState()
        }
    }

    /// Delete all downloads.
    func deleteAllDownloads() {
        for task in bookDownloadTasks.values {
            task.cancel()
        }
        bookDownloadTasks.removeAll()
        activeBookIds.removeAll()

        Task {
            await downloadService.deleteAllDownloads()
            await refreshState()
        }
    }

    // MARK: - Query Helpers

    /// Whether a book is fully downloaded.
    func isBookDownloaded(_ bookId: String) -> Bool {
        downloadedBookIds.contains(bookId)
    }

    /// Whether a book is currently downloading.
    func isBookDownloading(_ bookId: String) -> Bool {
        activeBookIds.contains(bookId)
    }

    /// Get the aggregate download state for a book.
    func bookDownloadState(_ bookId: String) -> BookDownloadState {
        if activeBookIds.contains(bookId) { return .downloading }
        if downloadedBookIds.contains(bookId) { return .complete }

        // Check if there are any partial downloads
        let hasFiles = downloadedBooks.contains { $0.bookId == bookId }
        if hasFiles { return .partial }

        return .none
    }

    /// Aggregate progress for a book (0.0 to 1.0).
    func bookProgress(_ bookId: String, audioFileIds: [String]) -> Double {
        guard !audioFileIds.isEmpty else { return 0 }
        let total = audioFileIds.reduce(0.0) { $0 + (fileProgress[$1] ?? 0) }
        return total / Double(audioFileIds.count)
    }

    /// Get the local file URL for a downloaded audio file.
    func localFileURL(for audioFileId: String) async -> URL? {
        await downloadService.localFileURL(for: audioFileId)
    }

    // MARK: - Private

    private func refreshState() async {
        let files = await downloadService.allDownloadedFiles()
        let metadata = await downloadService.allBookMetadata()
        let storage = await downloadService.totalStorageUsed()

        await MainActor.run {
            hydrateStateFromData(files: files, metadata: metadata, storage: storage)
        }
    }

    private func hydrateState(from manifest: DownloadManifest) {
        hydrateStateFromData(
            files: manifest.files,
            metadata: manifest.bookMetadata,
            storage: manifest.files.values
                .filter { $0.status == .completed }
                .reduce(0) { $0 + $1.fileSize }
        )
    }

    private func hydrateStateFromData(
        files: [String: DownloadedFile],
        metadata: [String: BookMetadataEntry],
        storage: Int64
    ) {
        // Update per-file state
        fileStatuses = files.mapValues(\.status)
        fileProgress = files.mapValues(\.progress)
        totalStorageUsed = storage

        // Group files by book
        var bookFiles: [String: [DownloadedFile]] = [:]
        for file in files.values {
            bookFiles[file.bookId, default: []].append(file)
        }

        // Build book download infos
        var books: [BookDownloadInfo] = []
        var completedIds: Set<String> = []

        for (bookId, bookFileList) in bookFiles {
            let meta = metadata[bookId]
            let info = BookDownloadInfo(
                bookId: bookId,
                bookTitle: meta?.title ?? "Unknown Book",
                authorNames: meta?.authorNames ?? [],
                coverImageR2Key: meta?.coverImageR2Key,
                files: bookFileList
            )
            books.append(info)

            if info.isComplete {
                completedIds.insert(bookId)
            }
        }

        downloadedBooks = books.sorted {
            $0.bookTitle == $1.bookTitle ? $0.bookId < $1.bookId : $0.bookTitle < $1.bookTitle
        }
        downloadedBookIds = completedIds
    }

    private func availableDiskSpace() -> Int64? {
        let home = URL(fileURLWithPath: NSHomeDirectory())
        guard let values = try? home.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey]),
              let available = values.volumeAvailableCapacityForImportantUsage else { return nil }
        return available
    }
}
