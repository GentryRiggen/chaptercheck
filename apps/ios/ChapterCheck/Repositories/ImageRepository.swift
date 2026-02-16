import ConvexMobile
import Foundation
import os

/// Actor that generates and caches presigned image URLs from R2 storage.
///
/// Cover images and author photos are stored as R2 keys in the database.
/// To display them, we call a Convex action that returns a time-limited
/// presigned URL. This actor caches those URLs so we don't re-generate
/// them on every view appearance.
///
/// Cache entries expire after 55 minutes (presigned URLs are valid for 1 hour,
/// so we refresh with a 5-minute safety margin).
actor ImageRepository {

    static let shared = ImageRepository()

    private let convex: ConvexService
    private let logger = Logger(subsystem: "com.chaptercheck", category: "ImageRepository")

    /// Cached presigned URL with its generation timestamp.
    private struct CacheEntry {
        let url: URL
        let generatedAt: Date
    }

    /// In-memory URL cache keyed by R2 storage key.
    private var cache: [String: CacheEntry] = [:]

    /// How long a cached URL is considered valid (50 minutes).
    /// Presigned URLs expire after 1 hour; refresh 10 minutes early.
    private static let cacheTTL: TimeInterval = 50 * 60

    /// In-flight requests keyed by R2 key, to avoid duplicate concurrent fetches.
    private var inFlightTasks: [String: Task<URL, Error>] = [:]

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Public API

    /// Get a displayable URL for an R2 image key.
    ///
    /// If the key is already an external URL (e.g., seeded data from OpenLibrary),
    /// it is returned directly without calling Convex.
    ///
    /// - Parameter r2Key: The R2 storage key, or an `https://` URL for external images.
    /// - Returns: A `URL` suitable for `AsyncImage` or similar, or `nil` if generation fails.
    func getImageUrl(r2Key: String) async -> URL? {
        // External URLs (seed data) bypass the cache entirely
        if r2Key.hasPrefix("http://") || r2Key.hasPrefix("https://") {
            return URL(string: r2Key)
        }

        // Return cached URL if still valid
        if let entry = cache[r2Key], !isExpired(entry) {
            return entry.url
        }

        // Coalesce concurrent requests for the same key
        if let existingTask = inFlightTasks[r2Key] {
            return try? await existingTask.value
        }

        let task = Task<URL, Error> {
            let url = try await generateUrl(for: r2Key)
            return url
        }

        inFlightTasks[r2Key] = task

        do {
            let url = try await task.value
            cache[r2Key] = CacheEntry(url: url, generatedAt: Date())
            inFlightTasks[r2Key] = nil
            return url
        } catch {
            inFlightTasks[r2Key] = nil
            logger.error("Failed to generate image URL for key '\(r2Key)': \(error.localizedDescription)")
            return nil
        }
    }

    /// Remove all cached URLs. Useful when the user signs out.
    func clearCache() {
        cache.removeAll()
    }

    /// Remove a specific cached URL (e.g., after an image is updated).
    func invalidate(r2Key: String) {
        cache.removeValue(forKey: r2Key)
    }

    // MARK: - Private

    /// Response shape from the `images/actions:generateImageUrl` Convex action.
    private struct ImageUrlResponse: Decodable {
        let imageUrl: String
    }

    private func generateUrl(for r2Key: String) async throws -> URL {
        let response: ImageUrlResponse = try await convex.action(
            "images/actions:generateImageUrl",
            with: ["r2Key": r2Key]
        )

        guard let url = URL(string: response.imageUrl) else {
            throw URLError(.badURL)
        }

        return url
    }

    private func isExpired(_ entry: CacheEntry) -> Bool {
        Date().timeIntervalSince(entry.generatedAt) >= Self.cacheTTL
    }
}
