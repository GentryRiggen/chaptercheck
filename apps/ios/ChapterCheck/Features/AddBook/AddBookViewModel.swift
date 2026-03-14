import Foundation

/// View model for the OpenLibrary book search sheet.
@Observable
@MainActor
final class AddBookViewModel {

    var query = ""
    var results: [OpenLibraryBookSuggestion] = []
    var isSearching = false
    var error: String?

    private let repository = OpenLibraryRepository()
    private var searchTask: Task<Void, Never>?

    /// Called when the search query changes. Debounces 300ms before searching.
    func onQueryChanged() {
        searchTask?.cancel()

        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard trimmed.count >= 2 else {
            results = []
            isSearching = false
            return
        }

        isSearching = true
        searchTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }
            await search(trimmed)
        }
    }

    private func search(_ query: String) async {
        do {
            let searchResults = try await repository.searchBooks(query: query)
            guard !Task.isCancelled else { return }
            results = searchResults
            error = nil
        } catch {
            guard !Task.isCancelled else { return }
            self.error = "Search failed. Please try again."
        }
        isSearching = false
    }
}
