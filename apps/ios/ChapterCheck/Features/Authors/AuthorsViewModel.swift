import Combine
import ConvexMobile
import Foundation
import os

/// View model for the authors browsing screen.
///
/// Supports two modes:
/// 1. **Browse mode** (default): Paginated list with sort options, using cursor-based pagination.
/// 2. **Search mode**: Activated when `searchText` is non-empty. Uses a debounced (300ms)
///    subscription to the search query. Non-paginated.
///
/// When `searchText` or `sortOption` changes, the current subscription is cancelled
/// and a new one is created.
@Observable
@MainActor
final class AuthorsViewModel {

    // MARK: - Sort Options

    enum AuthorSortOption: String, CaseIterable, Identifiable {
        case nameAsc = "name_asc"
        case nameDesc = "name_desc"
        case recent = "recent"

        var id: String { rawValue }

        var displayName: String {
            switch self {
            case .nameAsc: "A-Z"
            case .nameDesc: "Z-A"
            case .recent: "Recent"
            }
        }

        var icon: String {
            switch self {
            case .nameAsc: "arrow.up"
            case .nameDesc: "arrow.down"
            case .recent: "clock"
            }
        }
    }

    // MARK: - Public State

    var authors: [AuthorWithCounts] = []
    var isLoading = true
    var isLoadingMore = false
    var searchText: String = ""
    var sortOption: AuthorSortOption = .nameAsc
    var error: String?

    /// Whether more pages are available for infinite scroll.
    var hasMore = true

    // MARK: - Dependencies

    private let logger = Logger(subsystem: "com.chaptercheck", category: "AuthorsViewModel")
    private let authorRepository = AuthorRepository()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Pagination State

    private var currentCursor: String?
    private var isSearchMode: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }

    // MARK: - Debounce

    private var searchDebounceTask: Task<Void, Never>?
    private static let searchDebounceDelay: Duration = .milliseconds(300)

    // MARK: - Lifecycle

    func subscribe() {
        logger.info("subscribe() called, isSearchMode=\(self.isSearchMode), sort=\(self.sortOption.rawValue)")
        loadFirstPage()
    }

    func unsubscribe() {
        cancellables.removeAll()
        searchDebounceTask?.cancel()
    }

    // MARK: - Search

    /// Called when the search text changes. Debounces the query by 300ms
    /// before creating a new subscription.
    func onSearchTextChanged() {
        searchDebounceTask?.cancel()

        if isSearchMode {
            searchDebounceTask = Task {
                try? await Task.sleep(for: Self.searchDebounceDelay)
                guard !Task.isCancelled else { return }
                performSearch()
            }
        } else {
            // Cleared search, go back to browse mode
            resetAndReload()
        }
    }

    // MARK: - Sort

    /// Called when the sort option changes. Resets pagination and reloads.
    func onSortChanged() {
        resetAndReload()
    }

    // MARK: - Pagination

    /// Load the next page of results. Called when the last item appears on screen.
    func loadNextPage() {
        guard !isSearchMode, !isLoadingMore, hasMore, currentCursor != nil else { return }
        isLoadingMore = true
        subscribeToPage(cursor: currentCursor)
    }

    // MARK: - Private

    private func loadFirstPage() {
        cancellables.removeAll()
        authors = []
        currentCursor = nil
        hasMore = true
        isLoading = true
        error = nil

        subscribeToPage(cursor: nil)
    }

    private func resetAndReload() {
        cancellables.removeAll()
        searchDebounceTask?.cancel()
        loadFirstPage()
    }

    private func performSearch() {
        cancellables.removeAll()
        authors = []
        isLoading = true
        error = nil
        hasMore = false

        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else {
            isLoading = false
            return
        }

        let pub = authorRepository.subscribeToAuthorSearch(query: query)
        logger.info("performSearch: query='\(query)', publisher=\(pub != nil ? "created" : "nil")")

        pub?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("author search FAILED: \(error)")
                        self?.error = error.localizedDescription
                        self?.isLoading = false
                    }
                },
                receiveValue: { [weak self] results in
                    self?.logger.info("author search: received \(results.count) results")
                    self?.authors = results
                    self?.isLoading = false
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToPage(cursor: String?) {
        logger.info("subscribeToPage: sort=\(self.sortOption.rawValue), cursor=\(cursor ?? "nil")")

        let pub = authorRepository.subscribeToAuthorList(
            sort: sortOption.rawValue,
            numItems: 20,
            cursor: cursor
        )
        logger.info("subscribeToPage: publisher=\(pub != nil ? "created" : "nil")")

        pub?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("authorList FAILED: \(error)")
                        self?.error = error.localizedDescription
                        self?.isLoading = false
                        self?.isLoadingMore = false
                    }
                },
                receiveValue: { [weak self] result in
                    guard let self else { return }

                    self.logger.info("authorList: received page with \(result.page.count) authors, isDone=\(result.isDone)")

                    if cursor == nil {
                        // First page -- replace
                        self.authors = result.page
                    } else {
                        // Subsequent page -- append new items, deduplicating
                        let existingIds = Set(self.authors.map(\._id))
                        let newItems = result.page.filter { !existingIds.contains($0._id) }
                        self.authors.append(contentsOf: newItems)
                    }

                    self.currentCursor = result.isDone ? nil : result.continueCursor
                    self.hasMore = !result.isDone
                    self.isLoading = false
                    self.isLoadingMore = false
                }
            )
            .store(in: &cancellables)
    }
}
