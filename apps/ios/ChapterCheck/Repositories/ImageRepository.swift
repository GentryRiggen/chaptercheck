import ConvexMobile
import CryptoKit
import Foundation
import os

/// Actor that generates and caches presigned image URLs from R2 storage.
///
/// Cover images and author photos are stored as R2 keys in the database.
/// To display them, we call a Convex action that returns a time-limited
/// presigned URL. This actor caches those URLs so we don't re-generate
/// them on every view appearance.
///
/// Images are also cached to disk so they load instantly on subsequent
/// launches and display offline. Disk cache is stored in
/// `Library/Caches/BookCovers/` which iOS may evict under disk pressure.
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

    /// Disk cache directory: `Library/Caches/BookCovers/`
    private static let cacheDirectory: URL = {
        let caches = FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0]
        return caches.appendingPathComponent("BookCovers", isDirectory: true)
    }()

    /// Whether we've already ensured the cache directory exists this session.
    private var cacheDirectoryCreated = false

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Public API

    /// Get a displayable URL for an R2 image key.
    ///
    /// Returns a `file://` URL from disk cache when available (instant, offline-capable).
    /// Falls back to generating a presigned URL and downloading the image to disk.
    ///
    /// - Parameter r2Key: The R2 storage key, or an `https://` URL for external images.
    /// - Returns: A `URL` suitable for `AsyncImage` or similar, or `nil` if generation fails.
    func getImageUrl(r2Key: String) async -> URL? {
        // External URLs (seed data) bypass the cache entirely
        if r2Key.hasPrefix("http://") || r2Key.hasPrefix("https://") {
            return URL(string: r2Key)
        }

        // Check disk cache first — instant, works offline
        if let fileURL = diskCacheHit(for: r2Key) {
            return fileURL
        }

        // Fall back to in-memory presigned URL cache
        if let entry = cache[r2Key], !isExpired(entry) {
            return entry.url
        }

        // Coalesce concurrent requests for the same key
        if let existingTask = inFlightTasks[r2Key] {
            return try? await existingTask.value
        }

        let task = Task<URL, Error> {
            let presignedURL = try await generateUrl(for: r2Key)

            // Download and cache to disk; return file URL if successful
            if let fileURL = await downloadAndCache(presignedURL: presignedURL, r2Key: r2Key) {
                return fileURL
            }

            // Fall back to presigned URL if download fails
            return presignedURL
        }

        inFlightTasks[r2Key] = task

        do {
            let url = try await task.value
            inFlightTasks[r2Key] = nil

            // Only cache presigned URLs in memory (file URLs don't expire)
            if url.scheme != "file" {
                cache[r2Key] = CacheEntry(url: url, generatedAt: Date())
            }

            return url
        } catch {
            inFlightTasks[r2Key] = nil
            logger.error("Failed to generate image URL for key '\(r2Key)': \(error.localizedDescription)")
            return nil
        }
    }

    /// Remove all cached URLs and disk cache. Called on sign out.
    func clearCache() {
        cache.removeAll()

        let fm = FileManager.default
        if fm.fileExists(atPath: Self.cacheDirectory.path) {
            try? fm.removeItem(at: Self.cacheDirectory)
            cacheDirectoryCreated = false
        }
    }

    /// Remove a specific cached URL and its disk file (e.g., after an image is updated).
    func invalidate(r2Key: String) {
        cache.removeValue(forKey: r2Key)

        let fileURL = cacheFileURL(for: r2Key)
        try? FileManager.default.removeItem(at: fileURL)
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

    // MARK: - Disk Cache

    /// Returns the disk cache file URL for an r2Key (SHA256 hash + original extension).
    private func cacheFileURL(for r2Key: String) -> URL {
        let hash = SHA256.hash(data: Data(r2Key.utf8))
        let hashString = hash.map { String(format: "%02x", $0) }.joined()

        let rawExt = (r2Key as NSString).pathExtension
        let ext = rawExt.count <= 10 && rawExt.allSatisfy(\.isLetter) ? rawExt : ""
        let filename = ext.isEmpty ? hashString : "\(hashString).\(ext)"

        return Self.cacheDirectory.appendingPathComponent(filename)
    }

    /// Returns a `file://` URL if a non-empty image file exists on disk, otherwise `nil`.
    private func diskCacheHit(for r2Key: String) -> URL? {
        let fileURL = cacheFileURL(for: r2Key)
        let fm = FileManager.default
        guard fm.fileExists(atPath: fileURL.path),
              let attrs = try? fm.attributesOfItem(atPath: fileURL.path),
              let size = attrs[.size] as? Int, size > 0
        else {
            return nil
        }
        return fileURL
    }

    /// Creates the cache directory if it doesn't exist yet.
    private func ensureCacheDirectoryExists() {
        guard !cacheDirectoryCreated else { return }
        try? FileManager.default.createDirectory(at: Self.cacheDirectory, withIntermediateDirectories: true)
        cacheDirectoryCreated = true
    }

    /// Downloads the image from a presigned URL and writes it to disk cache.
    /// Returns the `file://` URL on success, or `nil` if the download fails.
    private func downloadAndCache(presignedURL: URL, r2Key: String) async -> URL? {
        do {
            let (data, response) = try await URLSession.shared.data(from: presignedURL)

            guard let httpResponse = response as? HTTPURLResponse,
                  (200 ... 299).contains(httpResponse.statusCode),
                  !data.isEmpty
            else {
                return nil
            }

            ensureCacheDirectoryExists()
            let fileURL = cacheFileURL(for: r2Key)
            try data.write(to: fileURL, options: .atomic)

            return fileURL
        } catch {
            logger.warning("Failed to download/cache image for '\(r2Key)': \(error.localizedDescription)")
            return nil
        }
    }
}
