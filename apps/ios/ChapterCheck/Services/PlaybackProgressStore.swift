import Foundation
import os

/// Persists per-book playback progress locally so this device can treat
/// on-device playback as the source of truth, even while offline or before
/// backend reconciliation catches up.
actor PlaybackProgressStore {

    static let shared = PlaybackProgressStore()

    private var entries: [String: CachedListeningProgress] = [:]
    private let logger = Logger(subsystem: "com.chaptercheck", category: "PlaybackProgressStore")

    private static var fileURL: URL {
        let docs = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0]
        return docs.appendingPathComponent("playback_progress.json")
    }

    init() {
        let url = Self.fileURL
        if FileManager.default.fileExists(atPath: url.path),
           let data = try? Data(contentsOf: url),
           let loaded = try? JSONDecoder().decode([String: CachedListeningProgress].self, from: data)
        {
            entries = loaded
        }
    }

    func saveLocalProgress(bookId: String, entry: CachedListeningProgress) {
        guard shouldReplaceLocal(existing: entries[bookId], with: entry) else { return }
        entries[bookId] = entry
        saveToDisk()
    }

    func mergeRemoteProgress(bookId: String, entry: CachedListeningProgress) {
        guard shouldReplaceRemote(existing: entries[bookId], with: entry) else { return }
        entries[bookId] = entry
        saveToDisk()
    }

    func progress(for bookId: String) -> CachedListeningProgress? {
        entries[bookId]
    }

    private func shouldReplaceLocal(
        existing: CachedListeningProgress?,
        with candidate: CachedListeningProgress
    ) -> Bool {
        guard let existing else { return true }
        if candidate.timestamp > existing.timestamp { return true }
        if candidate.timestamp < existing.timestamp { return false }

        return candidate.audioFileId != existing.audioFileId
            || candidate.positionSeconds != existing.positionSeconds
            || candidate.playbackRate != existing.playbackRate
    }

    private func shouldReplaceRemote(
        existing: CachedListeningProgress?,
        with candidate: CachedListeningProgress
    ) -> Bool {
        guard let existing else { return true }
        guard candidate.timestamp > existing.timestamp else { return false }

        // Reject remote progress that would regress position on the same audio file.
        // Different audioFileId (part change) is always allowed through.
        if candidate.audioFileId == existing.audioFileId,
           candidate.positionSeconds < existing.positionSeconds {
            return false
        }

        return true
    }

    private func saveToDisk() {
        do {
            let data = try JSONEncoder().encode(entries)
            try data.write(to: Self.fileURL, options: .atomic)
        } catch {
            logger.error("Failed to save playback progress store: \(error.localizedDescription)")
        }
    }
}
