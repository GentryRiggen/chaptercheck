import Combine
import ConvexMobile
import Foundation

/// Repository for genre queries and genre-vote mutations.
///
/// Wraps the `genres` and `bookGenreVotes` Convex APIs. Genre votes are
/// per-user per-book and are replaced in full on each save (not incrementally toggled).
@MainActor
final class GenreRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to all genres in the system.
    func subscribeToAllGenres() -> AnyPublisher<[Genre], ClientError>? {
        convex.subscribe(to: "genres/queries:getAllGenres")
    }

    /// Subscribe to genres for a book, including vote counts and whether the current user voted.
    func subscribeToGenresForBook(bookId: String) -> AnyPublisher<[BookGenre], ClientError>? {
        convex.subscribe(
            to: "bookGenreVotes/queries:getGenresForBook",
            with: ["bookId": bookId]
        )
    }

    /// Subscribe to the current user's genre vote IDs for a specific book.
    /// Returns an array of genre ID strings.
    func subscribeToMyGenreVotes(bookId: String) -> AnyPublisher<[String], ClientError>? {
        convex.subscribe(
            to: "bookGenreVotes/queries:getMyGenreVotesForBook",
            with: ["bookId": bookId]
        )
    }

    // MARK: - Mutations

    /// Replace the current user's genre votes for a book.
    ///
    /// This is a full replacement — passing an empty array removes all votes.
    ///
    /// - Parameters:
    ///   - bookId: The `_id` of the book.
    ///   - genreIds: The complete set of genre IDs the user is voting for.
    func setGenreVotes(bookId: String, genreIds: [String]) async throws {
        let encodableGenreIds: [ConvexEncodable?] = genreIds.map { $0 as ConvexEncodable? }
        try await convex.mutation(
            "bookGenreVotes/mutations:setGenreVotes",
            with: [
                "bookId": bookId,
                "genreIds": encodableGenreIds,
            ]
        )
    }
}
