import Combine
import ConvexMobile
import Foundation

/// Repository for listening progress queries and mutations.
///
/// Progress is tracked per-user per-book: one row in `listeningProgress` stores the
/// current audio file, position, and playback rate. The backend upserts on save,
/// so repeated saves for the same book are idempotent.
@MainActor
final class ProgressRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to the current user's listening progress for a specific book.
    /// Emits `nil` when no progress has been saved for this book.
    func subscribeToProgress(bookId: String) -> AnyPublisher<ListeningProgress?, ClientError>? {
        convex.subscribe(
            to: "listeningProgress/queries:getProgressForBook",
            with: ["bookId": bookId]
        )
    }

    /// Subscribe to the user's recently listened books, enriched with book/audio details.
    /// Used for the "Continue Listening" section on the home page.
    func subscribeToRecentlyListening(
        limit: Int = 6
    ) -> AnyPublisher<[RecentListeningProgress], ClientError>? {
        convex.subscribe(
            to: "listeningProgress/queries:getRecentlyListening",
            with: ["limit": Double(limit)]
        )
    }

    /// Subscribe to listening stats for the home screen header.
    func subscribeToListeningStats() -> AnyPublisher<ListeningStats, ClientError>? {
        convex.subscribe(
            to: "listeningProgress/queries:getListeningStats",
            with: [:]
        )
    }

    // MARK: - Mutations

    /// Save or update listening progress for a book.
    ///
    /// The backend upserts by `(userId, bookId)` -- calling this with a new
    /// `audioFileId` (e.g., when advancing to the next part) updates the existing row.
    ///
    /// - Parameters:
    ///   - bookId: The `_id` of the book being listened to.
    ///   - audioFileId: The `_id` of the currently playing audio file.
    ///   - positionSeconds: Current playback position in seconds.
    ///   - playbackRate: Current playback speed (e.g., 1.0, 1.5, 2.0).
    ///   - audioDuration: The player-reported duration of the audio file, used to
    ///     backfill the stored duration when it was 0 at upload time.
    ///   - clientTimestamp: Device timestamp in epoch milliseconds for ordering
    ///     out-of-order saves from the same device.
    /// - Throws: `ClientError` if the audio file does not belong to the specified book.
    /// Immediately touch `lastListenedAt` so the book appears at the top of Continue Listening
    /// before any meaningful position data has been saved.
    func markListening(bookId: String, audioFileId: String) async throws {
        try await convex.mutation(
            "listeningProgress/mutations:markListening",
            with: [
                "bookId": bookId,
                "audioFileId": audioFileId,
            ]
        )
    }

    func saveProgress(
        bookId: String,
        audioFileId: String,
        positionSeconds: Double,
        playbackRate: Double,
        audioDuration: Double? = nil,
        clientTimestamp: Double? = nil
    ) async throws {
        try await convex.mutation(
            "listeningProgress/mutations:saveProgress",
            with: [
                "bookId": bookId,
                "audioFileId": audioFileId,
                "positionSeconds": positionSeconds,
                "playbackRate": playbackRate,
                "audioDuration": audioDuration,
                "clientTimestamp": clientTimestamp,
            ]
        )
    }
}
