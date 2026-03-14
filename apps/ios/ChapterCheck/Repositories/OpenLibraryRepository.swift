import ConvexMobile
import Foundation

/// Repository for OpenLibrary search and image upload actions.
@MainActor
final class OpenLibraryRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    /// Search OpenLibrary for books matching the query.
    func searchBooks(query: String) async throws -> [OpenLibraryBookSuggestion] {
        try await convex.action(
            "openLibrary/actions:searchBooks",
            with: ["query": query]
        )
    }

    /// Upload an image from a URL to R2 storage.
    ///
    /// - Returns: The R2 key for the uploaded image, or `nil` if the upload failed.
    func uploadImageFromUrl(imageUrl: String, pathPrefix: String, fileName: String) async throws -> String? {
        try await convex.action(
            "openLibrary/actions:uploadImageFromUrl",
            with: [
                "imageUrl": imageUrl,
                "pathPrefix": pathPrefix,
                "fileName": fileName,
            ]
        )
    }
}
