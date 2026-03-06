import Combine
import ConvexMobile
import Foundation

/// Repository for shelf-related Convex queries and mutations.
///
/// Provides reactive subscriptions for real-time data and async methods for
/// mutations. All calls delegate to `ConvexService`.
@MainActor
final class ShelfRepository {
    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Subscriptions

    /// Subscribe to all shelves belonging to a user.
    func subscribeToUserShelves(userId: String) -> AnyPublisher<UserShelvesResponse, ClientError> {
        convex.subscribe(to: "shelves/queries:getUserShelves", with: ["userId": userId])
    }

    /// Subscribe to the current user's shelves (home screen / browse).
    func subscribeToMyShelves() -> AnyPublisher<[Shelf], ClientError> {
        convex.subscribe(to: "shelves/queries:getMyShelves", with: [:])
    }

    /// Subscribe to a single shelf with its full book list.
    func subscribeToShelf(shelfId: String) -> AnyPublisher<ShelfDetail?, ClientError> {
        convex.subscribe(to: "shelves/queries:getShelf", with: ["shelfId": shelfId])
    }

    /// Subscribe to the current user's shelves annotated with whether a given book is in each.
    func subscribeToMyShelvesForBook(bookId: String) -> AnyPublisher<[ShelfForBook], ClientError> {
        convex.subscribe(to: "shelves/queries:getMyShelvesForBook", with: ["bookId": bookId])
    }

    // MARK: - Mutations

    /// Create a new shelf and return its ID.
    @discardableResult
    func createShelf(
        name: String,
        description: String?,
        isOrdered: Bool,
        isPublic: Bool
    ) async throws -> String {
        var args: [String: ConvexEncodable?] = [
            "name": name,
            "isOrdered": isOrdered,
            "isPublic": isPublic,
        ]
        if let description, !description.isEmpty {
            args["description"] = description
        }
        return try await convex.mutation("shelves/mutations:createShelf", with: args)
    }

    /// Update mutable fields on an existing shelf.
    func updateShelf(
        shelfId: String,
        name: String? = nil,
        description: String? = nil,
        isOrdered: Bool? = nil,
        isPublic: Bool? = nil
    ) async throws {
        var args: [String: ConvexEncodable?] = ["shelfId": shelfId]
        if let name { args["name"] = name }
        if let description { args["description"] = description }
        if let isOrdered { args["isOrdered"] = isOrdered }
        if let isPublic { args["isPublic"] = isPublic }
        let _: String = try await convex.mutation("shelves/mutations:updateShelf", with: args)
    }

    /// Permanently delete a shelf.
    func deleteShelf(shelfId: String) async throws {
        try await convex.mutation("shelves/mutations:deleteShelf", with: ["shelfId": shelfId])
    }

    /// Add a book to a shelf and return the new shelfBook ID.
    @discardableResult
    func addBookToShelf(shelfId: String, bookId: String) async throws -> String {
        try await convex.mutation("shelves/mutations:addBookToShelf", with: [
            "shelfId": shelfId,
            "bookId": bookId,
        ])
    }

    /// Remove a book from a shelf.
    func removeBookFromShelf(shelfId: String, bookId: String) async throws {
        try await convex.mutation("shelves/mutations:removeBookFromShelf", with: [
            "shelfId": shelfId,
            "bookId": bookId,
        ])
    }

    /// Persist a new ordering of books within a shelf.
    func reorderShelfBooks(shelfId: String, bookIds: [String]) async throws {
        let encodableBookIds: [ConvexEncodable?] = bookIds.map { $0 as ConvexEncodable? }
        try await convex.mutation("shelves/mutations:reorderShelfBooks", with: [
            "shelfId": shelfId,
            "bookIds": encodableBookIds,
        ])
    }
}
