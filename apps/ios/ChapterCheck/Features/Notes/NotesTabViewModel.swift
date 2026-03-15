import Combine
import ConvexMobile
import Foundation
import os

enum NotesSortMode: String, CaseIterable, Identifiable {
    case recentlyUpdated = "Recently Updated"
    case oldestFirst = "Oldest First"
    case byBook = "By Book"

    var id: String { rawValue }
}

@Observable
@MainActor
final class NotesTabViewModel {

    // MARK: - State

    var allNotes: [CrossBookNote] = []
    var allTags: [MemoryTag] = []
    var isLoading = true
    var error: String?

    // Filter state
    var searchText = ""
    var selectedEntryTypes: Set<String> = []
    var selectedTagIds: Set<String> = []
    var sortMode: NotesSortMode = .recentlyUpdated

    // MARK: - Dependencies

    private let networkMonitor = NetworkMonitor.shared
    private let logger = Logger(subsystem: "com.chaptercheck", category: "NotesTabViewModel")
    private let notesRepository = BookNotesRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    private var loadedSections: Set<String> = []
    private static let allSections: Set<String> = ["notes", "tags"]

    var isOffline: Bool { !networkMonitor.isConnected }
    private(set) var isShowingOfflineData = false

    // MARK: - Computed Properties

    var filteredNotes: [CrossBookNote] {
        var result = allNotes

        // Search filter
        if !searchText.isEmpty {
            let query = searchText.lowercased()
            result = result.filter { note in
                (note.noteText?.lowercased().contains(query) ?? false) ||
                (note.sourceText?.lowercased().contains(query) ?? false) ||
                note.book.title.lowercased().contains(query) ||
                (note.book.primaryAuthorName?.lowercased().contains(query) ?? false) ||
                (note.tags?.contains(where: { $0.name.lowercased().contains(query) }) ?? false)
            }
        }

        // Entry type filter
        if !selectedEntryTypes.isEmpty {
            result = result.filter { note in
                if let entryType = note.entryType {
                    return selectedEntryTypes.contains(entryType)
                }
                return selectedEntryTypes.contains("note")
            }
        }

        // Tag filter
        if !selectedTagIds.isEmpty {
            result = result.filter { note in
                guard let tags = note.tags else { return false }
                return tags.contains(where: { selectedTagIds.contains($0._id) })
            }
        }

        // Sort
        switch sortMode {
        case .recentlyUpdated:
            result.sort { $0.updatedAt > $1.updatedAt }
        case .oldestFirst:
            result.sort { $0.updatedAt < $1.updatedAt }
        case .byBook:
            result.sort { $0.book.title.localizedCompare($1.book.title) == .orderedAscending }
        }

        return result
    }

    var groupedByBook: [(book: CrossBookNoteSummary, notes: [CrossBookNote])] {
        let dict = Dictionary(grouping: filteredNotes, by: { $0.book._id })
        return dict.values
            .compactMap { notes -> (book: CrossBookNoteSummary, notes: [CrossBookNote])? in
                guard let first = notes.first else { return nil }
                return (book: first.book, notes: notes.sorted { $0.updatedAt > $1.updatedAt })
            }
            .sorted { $0.book.title.localizedCompare($1.book.title) == .orderedAscending }
    }

    var noteCount: Int { allNotes.count }

    var distinctBookCount: Int {
        Set(allNotes.map(\.book._id)).count
    }

    var tagCount: Int { allTags.count }

    // MARK: - Subscriptions

    func subscribe() {
        if isOffline {
            logger.info("Offline — no notes subscriptions")
            isShowingOfflineData = true
            isLoading = false
            return
        }

        isShowingOfflineData = false
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("Auth ready — subscribing to notes")
                subscribeToAllNotes()
                subscribeToTags()
            },
            onUnauthenticated: { [weak self] in
                guard let self else { return }
                logger.info("Auth lost — tearing down notes subscriptions")
                tearDownSubscriptions()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        tearDownSubscriptions()
    }

    func refresh() async {
        unsubscribe()
        isLoading = true
        error = nil
        subscribe()
        while isLoading && !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    func recoverFromOffline() {
        guard isShowingOfflineData else { return }
        logger.info("Network restored — switching to live notes data")
        isShowingOfflineData = false
        isLoading = true

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("Auth ready after offline recovery — subscribing to notes")
                subscribeToAllNotes()
                subscribeToTags()
            },
            onUnauthenticated: { [weak self] in
                guard let self else { return }
                tearDownSubscriptions()
            }
        )
        authObserver.needsResubscription()
    }

    private func tearDownSubscriptions() {
        cancellables.removeAll()
        loadedSections.removeAll()
    }

    // MARK: - Private Subscription Setup

    private func subscribeToAllNotes() {
        guard let publisher = notesRepository.subscribeToMyAllNotes() else {
            logger.warning("subscribeToMyAllNotes returned nil — ConvexService may not be initialized")
            handleSectionError("notes", message: "Unable to connect")
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("allNotes FAILED: \(error)")
                        self?.handleSectionError("notes", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] notes in
                    self?.logger.info("allNotes: received \(notes.count) notes")
                    self?.allNotes = notes
                    self?.markLoaded("notes")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToTags() {
        guard let publisher = notesRepository.subscribeToMyTags() else {
            logger.warning("subscribeToMyTags returned nil — ConvexService may not be initialized")
            handleSectionError("tags", message: "Unable to connect")
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("tags FAILED: \(error)")
                        self?.handleSectionError("tags", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] tags in
                    self?.logger.info("tags: received \(tags.count) tags")
                    self?.allTags = tags
                    self?.pruneStaleTagFilters()
                    self?.markLoaded("tags")
                }
            )
            .store(in: &cancellables)
    }

    /// Remove selected tag IDs that no longer exist (e.g., tag was deleted).
    private func pruneStaleTagFilters() {
        let validIds = Set(allTags.map(\._id))
        selectedTagIds = selectedTagIds.intersection(validIds)
    }

    private func markLoaded(_ section: String) {
        loadedSections.insert(section)
        error = nil
        if loadedSections.count >= 1 {
            isLoading = false
        }
    }

    private func handleSectionError(_ section: String, message: String) {
        if loadedSections.isEmpty {
            error = message
        }
        isLoading = false
    }

    // MARK: - CRUD

    func deleteNote(noteId: String) async {
        do {
            try await notesRepository.deleteNote(noteId: noteId)
        } catch {
            logger.error("Failed to delete note: \(error)")
        }
    }

    func createNote(
        bookId: String,
        noteText: String,
        entryType: String,
        sourceText: String?,
        tagIds: [String],
        isPublic: Bool? = nil
    ) async throws {
        try await notesRepository.createNote(
            bookId: bookId,
            audioFileId: nil,
            tagIds: tagIds,
            startSeconds: nil,
            endSeconds: nil,
            noteText: noteText,
            entryType: entryType,
            sourceText: sourceText,
            isPublic: isPublic
        )
    }

    func updateNote(
        noteId: String,
        noteText: String,
        entryType: String,
        sourceText: String?,
        tagIds: [String],
        isPublic: Bool? = nil
    ) async throws {
        try await notesRepository.updateNote(
            noteId: noteId,
            audioFileId: nil,
            tagIds: tagIds,
            startSeconds: nil,
            endSeconds: nil,
            noteText: noteText,
            entryType: entryType,
            sourceText: sourceText,
            isPublic: isPublic
        )
    }

    func createTag(name: String) async throws -> String {
        try await notesRepository.createTag(name: name)
    }
}
