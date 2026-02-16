import Combine
import ConvexMobile
import Foundation

/// Repository for series-related Convex queries.
///
/// Provides subscriptions for series detail and the books belonging to a series.
@MainActor
final class SeriesRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to a single series by ID. Emits `nil` when not found.
    func subscribeToSeries(id: String) -> AnyPublisher<Series?, ClientError>? {
        convex.subscribe(
            to: "series/queries:getSeries",
            with: ["seriesId": id]
        )
    }

    /// Subscribe to books in a series, ordered by `seriesOrder`, enriched with authors.
    func subscribeToBooksInSeries(seriesId: String) -> AnyPublisher<[BookWithDetails], ClientError>? {
        convex.subscribe(
            to: "series/queries:getBooksInSeriesWithAuthors",
            with: ["seriesId": seriesId]
        )
    }
}
