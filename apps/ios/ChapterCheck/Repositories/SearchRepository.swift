import Combine
import ConvexMobile
import Foundation

/// Repository for unified search across books and authors.
@MainActor
final class SearchRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    /// Subscribe to unified search results for the given query.
    /// Returns both matching books and authors in a single reactive subscription.
    func subscribeToUnifiedSearch(query: String) -> AnyPublisher<UnifiedSearchResult, ClientError>? {
        convex.subscribe(
            to: "search/queries:searchAll",
            with: ["search": query]
        )
    }
}
