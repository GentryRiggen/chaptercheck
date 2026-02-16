import Combine
import ConvexMobile
import Foundation

/// Repository for audio file queries and stream URL generation.
///
/// Audio files are user-scoped on the backend -- the `getAudioFilesForBook` query
/// automatically filters to files belonging to the current user's storage account.
/// Stream URLs are presigned R2 URLs valid for 1 hour.
@MainActor
final class AudioRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to audio files for a book, sorted by part number.
    /// Only returns files that belong to the current user's storage account.
    func subscribeToAudioFiles(bookId: String) -> AnyPublisher<[AudioFile], ClientError>? {
        convex.subscribe(
            to: "audioFiles/queries:getAudioFilesForBook",
            with: ["bookId": bookId]
        )
    }

    // MARK: - Actions

    /// Response shape returned by the `generateStreamUrl` Convex action.
    private struct StreamUrlResponse: Decodable {
        let streamUrl: String
    }

    /// Generate a presigned streaming URL for an audio file.
    ///
    /// The URL is valid for 1 hour. Callers should cache the result and
    /// regenerate before expiry (see `StreamURLCache`).
    ///
    /// - Parameter audioFileId: The `_id` of the audio file document.
    /// - Returns: A presigned HTTPS URL suitable for `AVPlayer`.
    /// - Throws: `ClientError` if the user lacks premium access or the file is inaccessible.
    func generateStreamUrl(audioFileId: String) async throws -> String {
        let response: StreamUrlResponse = try await convex.action(
            "audioFiles/actions:generateStreamUrl",
            with: ["audioFileId": audioFileId]
        )
        return response.streamUrl
    }
}
