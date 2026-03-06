import Combine
import ConvexMobile
import Foundation
import os

/// View model for the unified search screen.
///
/// Debounces the search query by 300ms, then subscribes to `search/queries:searchAll`
/// which returns both book and author results in a single reactive subscription.
@Observable
@MainActor
final class SearchViewModel {

    // MARK: - Public State

    var searchText: String = ""
    var bookResults: [BookWithDetails] = []
    var authorResults: [AuthorWithCounts] = []
    var userResults: [SearchUser] = []
    var isLoading = false
    var error: String?

    var hasResults: Bool { !bookResults.isEmpty || !authorResults.isEmpty || !userResults.isEmpty }
    var isSearchActive: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }

    // MARK: - Dependencies

    private let logger = Logger(subsystem: "com.chaptercheck", category: "SearchViewModel")
    private let searchRepository = SearchRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Debounce

    private var searchDebounceTask: Task<Void, Never>?
    private static let searchDebounceDelay: Duration = .milliseconds(300)

    // MARK: - Lifecycle

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
        searchDebounceTask?.cancel()
    }

    // MARK: - Search

    /// Called when the search text changes. Debounces by 300ms.
    func onSearchTextChanged() {
        searchDebounceTask?.cancel()

        let query = searchText.trimmingCharacters(in: .whitespaces)
        if query.isEmpty {
            cancellables.removeAll()
            bookResults = []
            authorResults = []
            userResults = []
            isLoading = false
            error = nil
            return
        }

        isLoading = true
        searchDebounceTask = Task {
            try? await Task.sleep(for: Self.searchDebounceDelay)
            guard !Task.isCancelled else { return }
            performSearch(query: query)
        }
    }

    // MARK: - Private

    private func performSearch(query: String) {
        cancellables.removeAll()
        error = nil

        guard authObserver.isAuthenticated else {
            isLoading = false
            return
        }

        guard let pub = searchRepository.subscribeToUnifiedSearch(query: query) else {
            isLoading = false
            return
        }

        logger.info("performSearch: query='\(query)'")

        pub
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("search FAILED: \(error)")
                        self?.error = error.localizedDescription
                        self?.isLoading = false
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] result in
                    self?.logger.info("search: \(result.books.count) books, \(result.authors.count) authors, \(result.users?.count ?? 0) people")
                    self?.bookResults = result.books
                    self?.authorResults = result.authors
                    self?.userResults = result.users ?? []
                    self?.isLoading = false
                }
            )
            .store(in: &cancellables)
    }
}
