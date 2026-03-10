import Foundation
import os

/// Queued progress entry persisted to disk for offline playback.
struct QueuedProgress: Codable, Sendable {
    let bookId: String
    let audioFileId: String
    let positionSeconds: Double
    let playbackRate: Double
    let audioDuration: Double
    let timestamp: Double
}

/// Actor that queues progress saves when offline and flushes them when back online.
///
/// Persists entries to `Documents/offline_progress_queue.json`. Deduplicates by
/// `bookId` — only the latest position for each book matters. Observes
/// `.networkRestored` to auto-flush.
actor OfflineProgressQueue {

    static let shared = OfflineProgressQueue()

    private var entries: [QueuedProgress] = []
    private let logger = Logger(subsystem: "com.chaptercheck", category: "OfflineProgressQueue")
    private var notificationObserver: NSObjectProtocol?

    private static var fileURL: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("offline_progress_queue.json")
    }

    init() {
        let url = Self.fileURL
        if FileManager.default.fileExists(atPath: url.path),
           let data = try? Data(contentsOf: url),
           let loaded = try? JSONDecoder().decode([QueuedProgress].self, from: data)
        {
            entries = loaded
        }

        notificationObserver = NotificationCenter.default.addObserver(
            forName: Notification.Name.networkRestored,
            object: nil,
            queue: nil
        ) { [weak self] _ in
            guard let self else { return }
            Task {
                await self.flush()
            }
        }
    }

    // MARK: - Public API

    /// Add a progress entry, replacing any existing entry for the same book.
    func enqueue(_ entry: QueuedProgress) {
        entries.removeAll { $0.bookId == entry.bookId }
        entries.append(entry)
        saveToDisk()
        logger.info("Enqueued offline progress for book '\(entry.bookId)' at \(entry.positionSeconds)s")
    }

    /// Flush all queued entries by saving them to Convex via ProgressRepository.
    /// Removes each entry on successful save.
    func flush() async {
        guard !entries.isEmpty else { return }
        let isAuthenticated = await MainActor.run {
            if case .authenticated = ConvexService.shared.authState { return true }
            return false
        }
        guard isAuthenticated else {
            logger.info("Skipping offline progress flush — Convex auth not ready")
            return
        }

        logger.info("Flushing \(self.entries.count) offline progress entries")

        let progressRepository = await MainActor.run { ProgressRepository() }
        var remaining: [QueuedProgress] = []

        for entry in entries {
            do {
                try await progressRepository.saveProgress(
                    bookId: entry.bookId,
                    audioFileId: entry.audioFileId,
                    positionSeconds: entry.positionSeconds,
                    playbackRate: entry.playbackRate,
                    audioDuration: entry.audioDuration,
                    clientTimestamp: entry.timestamp
                )
                logger.info("Flushed progress for book '\(entry.bookId)'")
            } catch {
                logger.error("Failed to flush progress for book '\(entry.bookId)': \(error.localizedDescription)")
                remaining.append(entry)
            }
        }

        entries = remaining
        saveToDisk()
    }

    /// Whether there are pending entries.
    var hasPendingEntries: Bool {
        !entries.isEmpty
    }

    // MARK: - Private

    private func saveToDisk() {
        do {
            let data = try JSONEncoder().encode(entries)
            try data.write(to: Self.fileURL, options: .atomic)
        } catch {
            logger.error("Failed to save offline progress queue: \(error.localizedDescription)")
        }
    }
}
