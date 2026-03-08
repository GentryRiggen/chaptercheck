import Combine
import ConvexMobile
import Foundation

@MainActor
final class BookNotesRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    func subscribeToMyNotes(bookId: String) -> AnyPublisher<[BookNote], ClientError>? {
        convex.subscribe(
            to: "bookNotes/queries:getMyNotesForBook",
            with: ["bookId": bookId]
        )
    }

    func subscribeToMyCategories() -> AnyPublisher<[NoteCategory], ClientError>? {
        convex.subscribe(to: "bookNotes/queries:getMyNoteCategories")
    }

    func createCategory(name: String, colorToken: String) async throws -> String {
        let result: String = try await convex.mutation(
            "bookNotes/mutations:createCategory",
            with: [
                "name": name,
                "colorToken": colorToken,
            ]
        )
        return result
    }

    func createNote(
        bookId: String,
        audioFileId: String,
        categoryId: String?,
        startSeconds: Double,
        endSeconds: Double,
        noteText: String?
    ) async throws {
        var args: [String: ConvexEncodable?] = [
            "bookId": bookId,
            "audioFileId": audioFileId,
            "startSeconds": startSeconds,
            "endSeconds": endSeconds,
        ]
        if let categoryId {
            args["categoryId"] = categoryId
        }
        if let noteText, !noteText.isEmpty {
            args["noteText"] = noteText
        }
        try await convex.mutation("bookNotes/mutations:createNote", with: args)
    }

    func updateNote(
        noteId: String,
        audioFileId: String,
        categoryId: String?,
        startSeconds: Double,
        endSeconds: Double,
        noteText: String?
    ) async throws {
        var args: [String: ConvexEncodable?] = [
            "noteId": noteId,
            "audioFileId": audioFileId,
            "startSeconds": startSeconds,
            "endSeconds": endSeconds,
        ]
        if let categoryId {
            args["categoryId"] = categoryId
        }
        if let noteText, !noteText.isEmpty {
            args["noteText"] = noteText
        }
        try await convex.mutation("bookNotes/mutations:updateNote", with: args)
    }

    func deleteNote(noteId: String) async throws {
        try await convex.mutation(
            "bookNotes/mutations:deleteNote",
            with: ["noteId": noteId]
        )
    }
}
