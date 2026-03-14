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

    func subscribeToMyAllNotes() -> AnyPublisher<[CrossBookNote], ClientError>? {
        convex.subscribe(to: "bookNotes/queries:getMyAllNotes")
    }

    // MARK: - Tags (new system)

    func subscribeToMyTags() -> AnyPublisher<[MemoryTag], ClientError>? {
        convex.subscribe(to: "bookNotes/queries:getMyMemoryTags")
    }

    func createTag(name: String) async throws -> String {
        let result: String = try await convex.mutation(
            "bookNotes/mutations:createTag",
            with: ["name": name]
        )
        return result
    }

    // MARK: - Categories (legacy — kept for backward compat)

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

    // MARK: - Notes

    func createNote(
        bookId: String,
        audioFileId: String?,
        tagIds: [String]?,
        startSeconds: Double?,
        endSeconds: Double?,
        noteText: String?,
        entryType: String?,
        sourceText: String?,
        isPublic: Bool? = nil
    ) async throws {
        var args: [String: ConvexEncodable?] = [
            "bookId": bookId,
        ]
        if let audioFileId {
            args["audioFileId"] = audioFileId
        }
        if let startSeconds {
            args["startSeconds"] = startSeconds
        }
        if let endSeconds {
            args["endSeconds"] = endSeconds
        }
        if let tagIds, !tagIds.isEmpty {
            args["tagIds"] = tagIds.map { $0 as ConvexEncodable? } as [ConvexEncodable?]
        }
        if let noteText, !noteText.isEmpty {
            args["noteText"] = noteText
        }
        if let entryType {
            args["entryType"] = entryType
        }
        if let sourceText, !sourceText.isEmpty {
            args["sourceText"] = sourceText
        }
        if let isPublic {
            args["isPublic"] = isPublic
        }
        try await convex.mutation("bookNotes/mutations:createNote", with: args)
    }

    func updateNote(
        noteId: String,
        audioFileId: String?,
        tagIds: [String]?,
        startSeconds: Double?,
        endSeconds: Double?,
        noteText: String?,
        entryType: String?,
        sourceText: String?,
        isPublic: Bool? = nil
    ) async throws {
        var args: [String: ConvexEncodable?] = [
            "noteId": noteId,
        ]
        if let audioFileId {
            args["audioFileId"] = audioFileId
        }
        if let startSeconds {
            args["startSeconds"] = startSeconds
        }
        if let endSeconds {
            args["endSeconds"] = endSeconds
        }
        if let tagIds, !tagIds.isEmpty {
            args["tagIds"] = tagIds.map { $0 as ConvexEncodable? } as [ConvexEncodable?]
        }
        if let noteText, !noteText.isEmpty {
            args["noteText"] = noteText
        }
        if let entryType {
            args["entryType"] = entryType
        }
        if let sourceText, !sourceText.isEmpty {
            args["sourceText"] = sourceText
        }
        if let isPublic {
            args["isPublic"] = isPublic
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
