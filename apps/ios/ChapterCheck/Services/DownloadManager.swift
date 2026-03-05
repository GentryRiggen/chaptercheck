import Combine
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

    /// Set by MainView on book completion; BookDetailView reads this to show a confirmationDialog.
    var pendingDeletePromptBookId: String?

    // MARK: - Dependencies

    private let downloadService: DownloadService
    private let logger = Logger(subsystem: "com.chaptercheck", category: "DownloadManager")

    /// Active download tasks per book, so we can cancel them.
    private var bookDownloadTasks: [String: Task<Void, Never>] = [:]

    /// Active download tasks per individual audio file.
    private var fileDownloadTasks: [String: Task<Void, Never>] = [:]

    init() {
        self.downloadService = DownloadService(audioRepository: AudioRepository())
    }

    // MARK: - Initialization

    /// Load the manifest and hydrate observable state. Call once from `MainView.task`.
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

        // Store audio file metadata for offline playback reconstruction
        let audioMetas = audioFiles.map { file in
            AudioFileMetadataEntry(
                audioFileId: file._id,
                bookId: bookId,
                fileName: file.fileName,
                fileSize: file.fileSize,
                duration: file.duration,
                format: file.format,
                partNumber: file.partNumber,
                displayName: file.displayName
            )
        }

        let task = Task { [weak self] in
            guard let self else { return }

            // Persist audio file metadata for offline playback
            await self.downloadService.storeAudioFileMetadata(audioMetas)

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

    // MARK: - Download Single File

    /// Download a single audio file for a book.
    ///
    /// - Parameters:
    ///   - audioFile: The audio file to download.
    ///   - book: The book the file belongs to.
    ///   - allFiles: All audio files for the book (for metadata storage).
    func downloadAudioFile(audioFile: AudioFile, book: BookWithDetails, allFiles: [AudioFile]) {
        let audioFileId = audioFile._id
        let bookId = book._id
        guard fileDownloadTasks[audioFileId] == nil else { return }

        // Check disk space
        let totalBytes = Int64(audioFile.fileSize)
        if let available = availableDiskSpace(), totalBytes > available {
            logger.warning("Insufficient disk space: need \(totalBytes), have \(available)")
            return
        }

        fileStatuses[audioFileId] = .pending
        fileProgress[audioFileId] = 0

        let metadata = BookMetadataEntry(
            bookId: bookId,
            title: book.title,
            authorNames: book.authors.map(\.name),
            coverImageR2Key: book.coverImageR2Key
        )

        let audioMeta = AudioFileMetadataEntry(
            audioFileId: audioFile._id,
            bookId: bookId,
            fileName: audioFile.fileName,
            fileSize: audioFile.fileSize,
            duration: audioFile.duration,
            format: audioFile.format,
            partNumber: audioFile.partNumber,
            displayName: audioFile.displayName
        )

        let task = Task { [weak self] in
            guard let self else { return }

            defer {
                Task { @MainActor [weak self] in
                    self?.fileDownloadTasks.removeValue(forKey: audioFileId)
                }
            }

            await self.downloadService.storeAudioFileMetadata([audioMeta])

            await MainActor.run {
                self.fileStatuses[audioFileId] = .downloading
            }

            let stream = await self.downloadService.downloadFile(
                audioFileId: audioFileId,
                bookId: bookId,
                fileName: audioFile.fileName,
                fileSize: Int64(audioFile.fileSize),
                bookMetadata: metadata
            )

            for await (downloaded, total) in stream {
                guard !Task.isCancelled else { break }
                let progress = total > 0 ? Double(downloaded) / Double(total) : 0
                await MainActor.run {
                    self.fileProgress[audioFileId] = progress
                }
            }

            // Update status from manifest
            let files = await self.downloadService.allDownloadedFiles()
            if let file = files[audioFileId] {
                await MainActor.run {
                    self.fileStatuses[audioFileId] = file.status
                    if file.status == .completed {
                        self.fileProgress[audioFileId] = 1.0
                    }
                }
            }

            await self.refreshState()
        }

        fileDownloadTasks[audioFileId] = task
    }

    /// Cancel an in-progress single-file download.
    func cancelFileDownload(audioFileId: String, bookId: String) {
        fileDownloadTasks[audioFileId]?.cancel()
        fileDownloadTasks.removeValue(forKey: audioFileId)

        Task {
            await downloadService.deleteAudioFile(audioFileId: audioFileId, bookId: bookId)
            await refreshState()
        }
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

    /// Delete a single completed audio file from a book's download.
    func deleteAudioFile(audioFileId: String, bookId: String) {
        Task {
            await downloadService.deleteAudioFile(audioFileId: audioFileId, bookId: bookId)
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

    /// Whether a single file is currently downloading.
    func isFileDownloading(_ audioFileId: String) -> Bool {
        fileDownloadTasks[audioFileId] != nil
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

    /// Update cached listening progress for a downloaded book.
    func updateCachedProgress(
        bookId: String,
        audioFileId: String,
        positionSeconds: Double,
        playbackRate: Double,
        timestamp: Double
    ) async {
        let entry = CachedListeningProgress(
            audioFileId: audioFileId,
            positionSeconds: positionSeconds,
            playbackRate: playbackRate,
            timestamp: timestamp
        )
        await downloadService.updateListeningProgress(bookId: bookId, entry: entry)
    }

    /// Get cached listening progress for a downloaded book.
    func cachedProgress(for bookId: String) async -> CachedListeningProgress? {
        await downloadService.listeningProgress(for: bookId)
    }

    // MARK: - Offline Playback

    /// Construct playback data from the download manifest for offline use.
    ///
    /// Returns a `BookWithDetails` and sorted `[AudioFile]` built from stored
    /// manifest metadata, or `nil` if the book isn't fully downloaded.
    func offlinePlaybackData(for bookId: String) -> (BookWithDetails, [AudioFile])? {
        guard let info = downloadedBooks.first(where: { $0.bookId == bookId && $0.isComplete }) else {
            return nil
        }

        let now = Date().timeIntervalSince1970 * 1000

        let authors = info.authorNames.enumerated().map { index, name in
            BookAuthor(
                _id: "offline-author-\(index)",
                name: name
            )
        }

        let book = BookWithDetails(
            _id: info.bookId,
            _creationTime: now,
            title: info.bookTitle,
            coverImageR2Key: info.coverImageR2Key,
            createdAt: now,
            updatedAt: now,
            authors: authors
        )

        let audioFiles: [AudioFile]
        if !info.audioFileMetadata.isEmpty {
            audioFiles = info.audioFileMetadata
                .sorted { ($0.partNumber ?? 0) < ($1.partNumber ?? 0) }
                .map { meta in
                    AudioFile(
                        _id: meta.audioFileId,
                        _creationTime: now,
                        bookId: meta.bookId,
                        fileName: meta.fileName,
                        fileSize: meta.fileSize,
                        duration: meta.duration,
                        format: meta.format,
                        r2Key: "",
                        r2Bucket: "",
                        uploadedBy: "",
                        uploadedAt: now,
                        partNumber: meta.partNumber,
                        displayName: meta.displayName
                    )
                }
        } else {
            // Fallback: reconstruct minimal AudioFile objects from DownloadedFile
            // records when audioFileMetadata is missing (e.g., legacy downloads).
            audioFiles = info.files
                .filter(\.isComplete)
                .sorted { ($0.downloadedAt ?? .distantPast) < ($1.downloadedAt ?? .distantPast) }
                .enumerated()
                .map { index, file in
                    let ext = (file.fileName as NSString).pathExtension
                    return AudioFile(
                        _id: file.audioFileId,
                        _creationTime: now,
                        bookId: file.bookId,
                        fileName: file.fileName,
                        fileSize: Double(file.fileSize),
                        duration: 0,
                        format: ext.isEmpty ? "m4a" : ext,
                        r2Key: "",
                        r2Bucket: "",
                        uploadedBy: "",
                        uploadedAt: now,
                        partNumber: Double(index + 1),
                        displayName: nil
                    )
                }
        }

        guard !audioFiles.isEmpty else { return nil }
        return (book, audioFiles)
    }

    // MARK: - Metadata Refresh

    /// Fetch current book metadata from Convex and update stale manifest entries.
    func refreshDownloadedBookMetadata() async {
        let bookIds = Array(downloadedBookIds)
        guard !bookIds.isEmpty else { return }

        let bookRepository = BookRepository()
        var updatedEntries: [BookMetadataEntry] = []

        for bookId in bookIds {
            guard let publisher = bookRepository.subscribeToBook(id: bookId) else { continue }

            do {
                let book = try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<BookWithDetails?, Error>) in
                    var cancellable: AnyCancellable?
                    cancellable = publisher
                        .first()
                        .sink(
                            receiveCompletion: { completion in
                                switch completion {
                                case .finished:
                                    break
                                case .failure(let error):
                                    continuation.resume(throwing: error)
                                }
                                _ = cancellable // prevent premature dealloc
                            },
                            receiveValue: { value in
                                continuation.resume(returning: value)
                            }
                        )
                }

                guard let book else { continue }

                updatedEntries.append(BookMetadataEntry(
                    bookId: book._id,
                    title: book.title,
                    authorNames: book.authors.map(\.name),
                    coverImageR2Key: book.coverImageR2Key
                ))
            } catch {
                logger.warning("Failed to refresh metadata for book \(bookId): \(error.localizedDescription)")
            }
        }

        guard !updatedEntries.isEmpty else { return }
        await downloadService.updateBookMetadata(updatedEntries)
        await refreshState()
    }

    // MARK: - Private

    private func refreshState() async {
        let files = await downloadService.allDownloadedFiles()
        let metadata = await downloadService.allBookMetadata()
        let audioMeta = await downloadService.allAudioFileMetadata()
        let storage = await downloadService.totalStorageUsed()

        await MainActor.run {
            hydrateStateFromData(files: files, metadata: metadata, audioFileMetadata: audioMeta, storage: storage)
        }
    }

    private func hydrateState(from manifest: DownloadManifest) {
        hydrateStateFromData(
            files: manifest.files,
            metadata: manifest.bookMetadata,
            audioFileMetadata: manifest.audioFileMetadata,
            storage: manifest.files.values
                .filter { $0.status == .completed }
                .reduce(0) { $0 + $1.fileSize }
        )
    }

    private func hydrateStateFromData(
        files: [String: DownloadedFile],
        metadata: [String: BookMetadataEntry],
        audioFileMetadata: [String: AudioFileMetadataEntry] = [:],
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
            let bookAudioMeta = bookFileList.compactMap { audioFileMetadata[$0.audioFileId] }
            let info = BookDownloadInfo(
                bookId: bookId,
                bookTitle: meta?.title ?? "Unknown Book",
                authorNames: meta?.authorNames ?? [],
                coverImageR2Key: meta?.coverImageR2Key,
                files: bookFileList,
                audioFileMetadata: bookAudioMeta
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
