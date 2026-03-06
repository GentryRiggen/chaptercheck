import Combine
import ConvexMobile
import Foundation
import os

/// Filter categories for search results.
enum SearchFilter: String, CaseIterable {
    case all = "All"
    case books = "Books"
    case authors = "Authors"
    case series = "Series"
    case profiles = "Profiles"
}

/// View model for the unified search screen.
///
/// Debounces the search query by 300ms, then subscribes to `search/queries:searchAll`
/// which returns book, author, series, and user results in a single reactive subscription.
@Observable
@MainActor
final class SearchViewModel {

    // MARK: - Public State

    var searchText: String = ""
    var selectedFilter: SearchFilter = .all
    var bookResults: [BookWithDetails] = []
    var authorResults: [AuthorWithCounts] = []
    var seriesResults: [SearchSeries] = []
    var userResults: [SearchUser] = []
    var isLoading = false
    var error: String?

    var hasResults: Bool {
        !bookResults.isEmpty || !authorResults.isEmpty || !seriesResults.isEmpty || !userResults.isEmpty
    }

    var hasFilteredResults: Bool {
        switch selectedFilter {
        case .all: return hasResults
        case .books: return !bookResults.isEmpty
        case .authors: return !authorResults.isEmpty
        case .series: return !seriesResults.isEmpty
        case .profiles: return !userResults.isEmpty
        }
    }

    var isSearchActive: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }

    /// Filters that have at least one result, used to show only relevant pills.
    var availableFilters: [SearchFilter] {
        var filters: [SearchFilter] = [.all]
        if !bookResults.isEmpty { filters.append(.books) }
        if !authorResults.isEmpty { filters.append(.authors) }
        if !seriesResults.isEmpty { filters.append(.series) }
        if !userResults.isEmpty { filters.append(.profiles) }
        return filters
    }

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
            seriesResults = []
            userResults = []
            isLoading = false
            error = nil
            selectedFilter = .all
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
                    self?.logger.info("search: \(result.books.count) books, \(result.authors.count) authors, \(result.series?.count ?? 0) series, \(result.users?.count ?? 0) people")
                    self?.bookResults = result.books
                    self?.authorResults = result.authors
                    self?.seriesResults = result.series ?? []
                    self?.userResults = result.users ?? []
                    self?.isLoading = false
                    // Reset to .all if current filter has no results
                    if let self, !self.hasFilteredResults {
                        self.selectedFilter = .all
                    }
                }
            )
            .store(in: &cancellables)
    }
}
