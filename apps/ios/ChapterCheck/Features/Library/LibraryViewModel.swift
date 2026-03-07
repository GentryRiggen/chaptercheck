import Combine
import ConvexMobile
import Foundation
import os

/// View model for the library (book browsing) screen.
///
/// Supports three modes:
/// 1. **Browse mode** (default): Paginated list with sort options, using cursor-based pagination.
/// 2. **Search mode**: Activated when `searchText` is non-empty. Uses a debounced (300ms)
///    subscription to the search query. Non-paginated.
/// 3. **Genre filter mode**: Activated when `selectedGenreIds` is non-empty and search is inactive.
///    Uses a non-paginated subscription returning up to 50 results.
///
/// Mode priority: search > genre filter > browse.
/// When `searchText`, `sortOption`, or `selectedGenreIds` changes, the current subscription
/// is cancelled and a new one is created.
@Observable
@MainActor
final class LibraryViewModel {

    // MARK: - Public State

    var books: [BookWithDetails] = []
    var isLoading = true
    var isLoadingMore = false
    var searchText: String = ""
    var sortOption: SortOption = .titleAsc
    var selectedGenreIds: Set<String> = []
    var error: String?

    /// Whether more pages are available for infinite scroll.
    var hasMore = true

    // MARK: - Dependencies

    var downloadManager: DownloadManager?
    private let networkMonitor = NetworkMonitor.shared
    var isOffline: Bool { !networkMonitor.isConnected }

    private let logger = Logger(subsystem: "com.chaptercheck", category: "LibraryViewModel")
    private let bookRepository = BookRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Pagination State

    private var currentCursor: String?
    private var isSearchMode: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }
    var isGenreFilterActive: Bool { !selectedGenreIds.isEmpty }

    // MARK: - Debounce

    private var searchDebounceTask: Task<Void, Never>?
    private static let searchDebounceDelay: Duration = .milliseconds(300)

    // MARK: - Lifecycle

    func subscribe() {
        if isOffline {
            loadOfflineBooks()
            return
        }

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("subscribe() called, isSearchMode=\(self.isSearchMode), sort=\(self.sortOption.rawValue)")
                loadFirstPage()
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
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

    // MARK: - Genre Filter

    /// Called when the selected genre IDs change. Switches to genre filter mode
    /// (or back to browse mode when the selection is cleared), unless a search
    /// is already active — in that case the genre filter takes effect only after
    /// the search field is cleared.
    func onGenreFilterChanged() {
        if !isSearchMode {
            resetAndReload()
        }
    }

    // MARK: - Pagination

    /// Load the next page of results. Called when the last item appears on screen.
    /// No-op in search mode or genre filter mode (both are non-paginated).
    func loadNextPage() {
        guard !isSearchMode, !isGenreFilterActive, !isLoadingMore, hasMore, currentCursor != nil else { return }
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

        if isSearchMode {
            performSearch()
        } else if isGenreFilterActive {
            performGenreFilter()
        } else {
            subscribeToPage(cursor: nil)
        }
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

        let pub = bookRepository.subscribeToBookSearch(query: query)
        logger.info("performSearch: query='\(query)', publisher=\(pub != nil ? "created" : "nil")")

        pub?
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
                receiveValue: { [weak self] results in
                    self?.logger.info("search: received \(results.count) results")
                    self?.books = results
                    self?.isLoading = false
                }
            )
            .store(in: &cancellables)
    }

    private func performGenreFilter() {
        hasMore = false
        let genreIds = Array(selectedGenreIds)

        let pub = bookRepository.subscribeToFilteredBooks(genreIds: genreIds, sort: sortOption.rawValue)
        logger.info("performGenreFilter: genreCount=\(genreIds.count), sort=\(self.sortOption.rawValue), publisher=\(pub != nil ? "created" : "nil")")

        pub?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("genreFilter FAILED: \(error)")
                        self?.error = error.localizedDescription
                        self?.isLoading = false
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] results in
                    self?.logger.info("genreFilter: received \(results.count) results")
                    self?.books = results
                    self?.isLoading = false
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToPage(cursor: String?) {
        logger.info("subscribeToPage: sort=\(self.sortOption.rawValue), cursor=\(cursor ?? "nil")")

        let pub = bookRepository.subscribeToBookList(
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
                    self?.logger.error("bookList FAILED: \(error)")
                    self?.error = error.localizedDescription
                    self?.isLoading = false
                    self?.isLoadingMore = false
                    self?.authObserver.needsResubscription()
                }
            },
            receiveValue: { [weak self] result in
                guard let self else { return }

                self.logger.info("bookList: received page with \(result.page.count) books, isDone=\(result.isDone)")

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

    // MARK: - Offline

    private func loadOfflineBooks() {
        guard let dm = downloadManager else {
            isLoading = false
            return
        }

        let offlineBooks = dm.downloadedBooks
            .filter(\.isComplete)
            .compactMap { dm.offlinePlaybackData(for: $0.bookId)?.0 }
            .sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }

        books = offlineBooks
        hasMore = false
        isLoading = false
    }
}
