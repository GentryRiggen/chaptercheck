import Foundation
import os

/// Actor that caches presigned audio stream URLs.
///
/// Presigned R2 URLs for audio files are valid for 1 hour. This cache stores
/// generated URLs and automatically refreshes them 5 minutes before expiry
/// to avoid playback interruptions from expired URLs.
///
/// When the audio player needs a URL for a file it's about to play, it calls
/// `getUrl(audioFileId:)` which returns a cached URL if still valid, or
/// generates a fresh one via `AudioRepository`.
actor StreamURLCache {

    private let audioRepository: AudioRepository
    private let logger = Logger(subsystem: "com.chaptercheck", category: "StreamURLCache")

    /// Cached stream URL with its generation timestamp.
    private struct CacheEntry {
        let url: URL
        let generatedAt: Date
    }

    /// In-memory cache keyed by audio file ID.
    private var cache: [String: CacheEntry] = [:]

    /// In-flight URL generation tasks, to avoid duplicate concurrent fetches.
    private var inFlightTasks: [String: Task<URL, Error>] = [:]

    /// How long a cached URL is considered valid (50 minutes).
    /// R2 presigned URLs expire after 1 hour; we refresh 10 minutes early
    /// to account for slow network conditions and long-running streams.
    private static let cacheTTL: TimeInterval = 50 * 60

    init(audioRepository: AudioRepository) {
        self.audioRepository = audioRepository
    }

    // MARK: - Public API

    /// Get a streaming URL for the given audio file.
    ///
    /// Returns a cached URL if one exists and hasn't expired. Otherwise,
    /// calls the Convex action to generate a fresh presigned URL.
    ///
    /// - Parameter audioFileId: The `_id` of the audio file.
    /// - Returns: A presigned URL suitable for `AVPlayer`.
    /// - Throws: If the Convex action fails (e.g., no premium access).
    func getUrl(audioFileId: String) async throws -> URL {
        // Return cached URL if still valid
        if let entry = cache[audioFileId], !isExpired(entry) {
            return entry.url
        }

        // Coalesce concurrent requests for the same file
        if let existingTask = inFlightTasks[audioFileId] {
            return try await existingTask.value
        }

        let task = Task<URL, Error> {
            let urlString = try await audioRepository.generateStreamUrl(audioFileId: audioFileId)
            guard let url = URL(string: urlString) else {
                throw URLError(.badURL)
            }
            return url
        }

        inFlightTasks[audioFileId] = task

        do {
            let url = try await task.value
            cache[audioFileId] = CacheEntry(url: url, generatedAt: Date())
            inFlightTasks[audioFileId] = nil
            logger.debug("Cached stream URL for audioFile '\(audioFileId)'")
            return url
        } catch {
            inFlightTasks[audioFileId] = nil
            logger.error("Failed to generate stream URL for '\(audioFileId)': \(error.localizedDescription)")
            throw error
        }
    }

    /// Pre-warm the cache for an audio file that will be played soon.
    ///
    /// Use this to generate URLs for the next part of a multi-part book
    /// before the current part finishes, so playback transitions are seamless.
    func prefetch(audioFileId: String) {
        Task {
            _ = try? await getUrl(audioFileId: audioFileId)
        }
    }

    /// Remove all cached URLs. Call on sign-out to avoid leaking
    /// presigned URLs across user sessions.
    func clearCache() {
        cache.removeAll()
    }

    /// Invalidate a specific cached URL (e.g., if the underlying file changed).
    func invalidate(audioFileId: String) {
        cache.removeValue(forKey: audioFileId)
    }

    // MARK: - Private

    private func isExpired(_ entry: CacheEntry) -> Bool {
        Date().timeIntervalSince(entry.generatedAt) >= Self.cacheTTL
    }
}
