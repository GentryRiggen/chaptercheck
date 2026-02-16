import Combine
import ConvexMobile
import Foundation

/// View model for the library (book browsing) screen.
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
final class LibraryViewModel {

    // MARK: - Public State

    var books: [BookWithDetails] = []
    var isLoading = true
    var isLoadingMore = false
    var searchText: String = ""
    var sortOption: SortOption = .titleAsc
    var error: String?

    /// Whether more pages are available for infinite scroll.
    var hasMore = true

    // MARK: - Dependencies

    private let bookRepository = BookRepository()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Pagination State

    private var currentCursor: String?
    private var isSearchMode: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }

    // MARK: - Debounce

    private var searchDebounceTask: Task<Void, Never>?
    private static let searchDebounceDelay: Duration = .milliseconds(300)

    // MARK: - Lifecycle

    func subscribe() {
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
        books = []
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
        books = []
        isLoading = true
        error = nil
        hasMore = false

        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else {
            isLoading = false
            return
        }

        bookRepository.subscribeToBookSearch(query: query)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                        self?.isLoading = false
                    }
                },
                receiveValue: { [weak self] results in
                    self?.books = results
                    self?.isLoading = false
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToPage(cursor: String?) {
        bookRepository.subscribeToBookList(
            sort: sortOption.rawValue,
            numItems: 20,
            cursor: cursor
        )?
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.error = error.localizedDescription
                    self?.isLoading = false
                    self?.isLoadingMore = false
                }
            },
            receiveValue: { [weak self] result in
                guard let self else { return }

                if cursor == nil {
                    // First page -- replace
                    self.books = result.page
                } else {
                    // Subsequent page -- append new items, deduplicating
                    let existingIds = Set(self.books.map(\._id))
                    let newItems = result.page.filter { !existingIds.contains($0._id) }
                    self.books.append(contentsOf: newItems)
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
