import Combine
import ConvexMobile
import Foundation
import os

// MARK: - Library Category

/// The four browseable categories in the Library tab.
enum LibraryCategory: String, CaseIterable, Identifiable {
    case books
    case authors
    case series
    case shelves

    var id: String { rawValue }

    var label: String {
        switch self {
        case .books: "Books"
        case .authors: "Authors"
        case .series: "Series"
        case .shelves: "Shelves"
        }
    }

    var icon: String {
        switch self {
        case .books: "book.closed"
        case .authors: "person.2"
        case .series: "books.vertical"
        case .shelves: "tray.2"
        }
    }
}

// MARK: - Author Sort

/// Sort options for the Authors tab, mirroring `AuthorsViewModel.AuthorSortOption`.
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

// MARK: - Search Sort Options

/// Sort options for book results in unified search. Includes "Relevance" (search rank order).
enum SearchBookSort: String, CaseIterable, Identifiable {
    case relevance
    case titleAsc = "title_asc"
    case titleDesc = "title_desc"
    case topRated = "top_rated"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .relevance: "Relevance"
        case .titleAsc: "A-Z"
        case .titleDesc: "Z-A"
        case .topRated: "Top Rated"
        }
    }

    var icon: String {
        switch self {
        case .relevance: "sparkle.magnifyingglass"
        case .titleAsc: "arrow.up"
        case .titleDesc: "arrow.down"
        case .topRated: "star.fill"
        }
    }
}

/// Sort options for author results in unified search. Includes "Relevance" (search rank order).
enum SearchAuthorSort: String, CaseIterable, Identifiable {
    case relevance
    case nameAsc = "name_asc"
    case nameDesc = "name_desc"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .relevance: "Relevance"
        case .nameAsc: "A-Z"
        case .nameDesc: "Z-A"
        }
    }

    var icon: String {
        switch self {
        case .relevance: "sparkle.magnifyingglass"
        case .nameAsc: "arrow.up"
        case .nameDesc: "arrow.down"
        }
    }
}

// MARK: - Series Sort

enum SeriesSortOption: String, CaseIterable, Identifiable {
    case recent = "recent"
    case nameAsc = "name_asc"
    case nameDesc = "name_desc"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .recent: "Recent"
        case .nameAsc: "A-Z"
        case .nameDesc: "Z-A"
        }
    }

    var icon: String {
        switch self {
        case .recent: "clock"
        case .nameAsc: "arrow.up"
        case .nameDesc: "arrow.down"
        }
    }
}

// MARK: - Shelf Sort

enum ShelfSortOption: String, CaseIterable, Identifiable {
    case recentlyUpdated = "recently_updated"
    case nameAsc = "name_asc"
    case mostBooks = "most_books"

    var id: String { rawValue }

    var displayName: String {
        switch self {
        case .recentlyUpdated: "Recently Updated"
        case .nameAsc: "A-Z"
        case .mostBooks: "Most Books"
        }
    }

    var icon: String {
        switch self {
        case .recentlyUpdated: "clock"
        case .nameAsc: "arrow.up"
        case .mostBooks: "number"
        }
    }
}

// MARK: - LibraryViewModel

/// View model for the unified Library discovery hub.
///
/// Supports four browseable categories (Books, Authors, Series, Shelves) and
/// a cross-cutting unified search mode activated whenever `searchText` is non-empty.
///
/// Mode priority: unified search (when `searchText` non-empty) > category browse.
/// Within the Books category, genre filter mode overrides paginated browse (matching
/// the original LibraryViewModel behaviour).
@Observable
@MainActor
final class LibraryViewModel {

    // MARK: - Navigation / Category

    var selectedCategory: LibraryCategory = .books

    // MARK: - Shared Search State

    /// Drives both per-category book search (legacy path, no longer activated —
    /// non-empty text goes straight to unified search) and the unified search
    /// subscription across all categories.
    var searchText: String = ""

    // MARK: - Book State (preserved from original)

    var books: [BookWithDetails] = []
    var isBookLoading = true
    var isLoadingMore = false
    var bookSortOption: SortOption = .titleAsc
    var selectedGenreIds: Set<String> = []
    var bookError: String?
    var hasMoreBooks = true

    var isGenreFilterActive: Bool { !selectedGenreIds.isEmpty }

    // MARK: - Author State

    var authors: [AuthorWithCounts] = []
    var isAuthorLoading = true
    var isLoadingMoreAuthors = false
    var authorSortOption: AuthorSortOption = .nameAsc
    var authorError: String?
    var hasMoreAuthors = true

    // MARK: - Series State

    var seriesList: [SeriesWithPreview] = []
    var isSeriesLoading = false
    var seriesSortOption: SeriesSortOption = .recent
    var seriesError: String?

    var sortedSeriesList: [SeriesWithPreview] {
        switch seriesSortOption {
        case .recent:
            seriesList
        case .nameAsc:
            seriesList.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .nameDesc:
            seriesList.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedDescending }
        }
    }

    // MARK: - Shelves State

    var shelves: [Shelf] = []
    var isShelvesLoading = true
    var shelfSortOption: ShelfSortOption = .recentlyUpdated
    var shelvesError: String?

    var sortedShelves: [Shelf] {
        switch shelfSortOption {
        case .recentlyUpdated:
            shelves // already sorted by updatedAt desc from backend
        case .nameAsc:
            shelves.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .mostBooks:
            shelves.sorted { $0.bookCountInt > $1.bookCountInt }
        }
    }

    // MARK: - Unified Search State

    var unifiedBooks: [BookWithDetails] = []
    var unifiedAuthors: [AuthorWithCounts] = []
    var unifiedSeries: [SearchSeries] = []
    var isUnifiedSearchLoading = false
    var unifiedSearchError: String?

    /// Sort for unified search book results. Defaults to relevance (search order).
    var searchBookSort: SearchBookSort = .relevance
    /// Sort for unified search author results.
    var searchAuthorSort: SearchAuthorSort = .relevance
    /// Category filter for search results. nil = show all categories.
    var searchFilterCategory: LibraryCategory?

    var isUnifiedSearchMode: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }

    var hasUnifiedResults: Bool {
        switch searchFilterCategory {
        case nil: !unifiedBooks.isEmpty || !unifiedAuthors.isEmpty || !unifiedSeries.isEmpty
        case .books: !unifiedBooks.isEmpty
        case .authors: !unifiedAuthors.isEmpty
        case .series: !unifiedSeries.isEmpty
        case .shelves: false // no shelf search results currently
        }
    }

    var sortedUnifiedBooks: [BookWithDetails] {
        switch searchBookSort {
        case .relevance: unifiedBooks
        case .titleAsc: unifiedBooks.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }
        case .titleDesc: unifiedBooks.sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedDescending }
        case .topRated: unifiedBooks.sorted { ($0.averageRating ?? 0) > ($1.averageRating ?? 0) }
        }
    }

    var sortedUnifiedAuthors: [AuthorWithCounts] {
        switch searchAuthorSort {
        case .relevance: unifiedAuthors
        case .nameAsc: unifiedAuthors.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }
        case .nameDesc: unifiedAuthors.sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedDescending }
        }
    }

    // MARK: - Dependencies

    var downloadManager: DownloadManager?
    private let networkMonitor = NetworkMonitor.shared
    var isOffline: Bool { !networkMonitor.isConnected }
    private(set) var isShowingOfflineData = false

    private let logger = Logger(subsystem: "com.chaptercheck", category: "LibraryViewModel")
    private let bookRepository = BookRepository()
    private let authorRepository = AuthorRepository()
    private let searchRepository = SearchRepository()
    private let shelfRepository = ShelfRepository()
    private let authObserver = ConvexAuthObserver()

    private var bookCancellables = Set<AnyCancellable>()
    private var authorCancellables = Set<AnyCancellable>()
    private var seriesCancellables = Set<AnyCancellable>()
    private var shelfCancellables = Set<AnyCancellable>()
    private var unifiedCancellables = Set<AnyCancellable>()

    // MARK: - Pagination Cursors

    private var bookCursor: String?
    private var authorCursor: String?

    // MARK: - Debounce

    private var searchDebounceTask: Task<Void, Never>?
    private static let searchDebounceDelay: Duration = .milliseconds(300)

    // MARK: - Convenience aliases (preserve original LibraryView read paths)

    var isLoading: Bool { isBookLoading }
    var error: String? { bookError }
    var hasMore: Bool { hasMoreBooks }

    // MARK: - Lifecycle

    func subscribe() {
        if isOffline {
            isShowingOfflineData = true
            loadOfflineBooks()
            return
        }

        isShowingOfflineData = false
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self else { return }
                logger.info("subscribe() — category=\(self.selectedCategory.rawValue)")
                // Books are always loaded eagerly (default category).
                if bookCancellables.isEmpty { loadBooksFirstPage() }
                // Lazily bootstrap whichever non-books category is already selected.
                switch selectedCategory {
                case .books: break
                case .authors: if authorCancellables.isEmpty { loadAuthorsFirstPage() }
                case .series: if seriesCancellables.isEmpty { loadSeries() }
                case .shelves: if shelfCancellables.isEmpty { loadShelves() }
                }
            },
            onUnauthenticated: { [weak self] in
                self?.bookCancellables.removeAll()
                self?.authorCancellables.removeAll()
                self?.seriesCancellables.removeAll()
                self?.shelfCancellables.removeAll()
                self?.unifiedCancellables.removeAll()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        bookCancellables.removeAll()
        authorCancellables.removeAll()
        seriesCancellables.removeAll()
        shelfCancellables.removeAll()
        unifiedCancellables.removeAll()
        searchDebounceTask?.cancel()
    }

    /// Pull-to-refresh for the currently visible category.
    func refresh() async {
        switch selectedCategory {
        case .books:
            bookCancellables.removeAll()
            isBookLoading = true
            bookError = nil
            loadBooksFirstPage()
            while isBookLoading && !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(50))
            }
        case .authors:
            authorCancellables.removeAll()
            isAuthorLoading = true
            authorError = nil
            loadAuthorsFirstPage()
            while isAuthorLoading && !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(50))
            }
        case .series:
            seriesCancellables.removeAll()
            isSeriesLoading = true
            seriesError = nil
            loadSeries()
            while isSeriesLoading && !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(50))
            }
        case .shelves:
            shelfCancellables.removeAll()
            isShelvesLoading = true
            shelvesError = nil
            loadShelves()
            while isShelvesLoading && !Task.isCancelled {
                try? await Task.sleep(for: .milliseconds(50))
            }
        }
    }

    /// Called when the user taps a category pill. Lazily starts subscriptions.
    func onCategoryChanged() {
        guard !isUnifiedSearchMode else { return }
        switch selectedCategory {
        case .books: break
        case .authors: if authorCancellables.isEmpty { loadAuthorsFirstPage() }
        case .series: if seriesCancellables.isEmpty { loadSeries() }
        case .shelves: if shelfCancellables.isEmpty { loadShelves() }
        }
    }

    /// Recover from offline to live Convex subscriptions.
    func recoverFromOffline() {
        guard isShowingOfflineData else { return }
        isShowingOfflineData = false

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, bookCancellables.isEmpty else { return }
                loadBooksFirstPage()
            },
            onUnauthenticated: { [weak self] in
                self?.bookCancellables.removeAll()
            }
        )
        authObserver.needsResubscription()
    }

    // MARK: - Search

    /// Called when `searchText` changes. Non-empty text activates unified search
    /// across all categories. Clearing the text cancels unified search and returns
    /// each category to its browse subscription.
    func onSearchTextChanged() {
        searchDebounceTask?.cancel()

        if isUnifiedSearchMode {
            isUnifiedSearchLoading = true
            searchDebounceTask = Task {
                try? await Task.sleep(for: Self.searchDebounceDelay)
                guard !Task.isCancelled else { return }
                performUnifiedSearch()
            }
        } else {
            unifiedCancellables.removeAll()
            unifiedBooks = []
            unifiedAuthors = []
            unifiedSeries = []
            isUnifiedSearchLoading = false
            unifiedSearchError = nil
            searchBookSort = .relevance
            searchAuthorSort = .relevance
            searchFilterCategory = nil
        }
    }

    // MARK: - Book Sort / Genre Filter (original API preserved)

    func onSortChanged() {
        bookCancellables.removeAll()
        searchDebounceTask?.cancel()
        loadBooksFirstPage()
    }

    func onGenreFilterChanged() {
        guard !isUnifiedSearchMode else { return }
        bookCancellables.removeAll()
        searchDebounceTask?.cancel()
        loadBooksFirstPage()
    }

    // MARK: - Author Sort

    func onAuthorSortChanged() {
        authorCancellables.removeAll()
        loadAuthorsFirstPage()
    }

    // MARK: - Retry

    func retryBooks() {
        bookCancellables.removeAll()
        bookError = nil
        loadBooksFirstPage()
    }

    func retryAuthors() {
        authorCancellables.removeAll()
        authorError = nil
        loadAuthorsFirstPage()
    }

    func retrySeries() {
        seriesCancellables.removeAll()
        seriesError = nil
        loadSeries()
    }

    func retryShelves() {
        shelfCancellables.removeAll()
        shelvesError = nil
        loadShelves()
    }

    // MARK: - Book Pagination

    /// Called when the last book card appears on screen. No-op in genre filter mode.
    func loadNextBookPage() {
        guard !isUnifiedSearchMode,
              !isGenreFilterActive,
              !isLoadingMore,
              hasMoreBooks,
              bookCursor != nil else { return }
        isLoadingMore = true
        subscribeToBookPage(cursor: bookCursor)
    }

    // MARK: - Author Pagination

    /// Called when the last author card appears on screen.
    func loadNextAuthorPage() {
        guard !isUnifiedSearchMode,
              !isLoadingMoreAuthors,
              hasMoreAuthors,
              authorCursor != nil else { return }
        isLoadingMoreAuthors = true
        subscribeToAuthorPage(cursor: authorCursor)
    }

    // MARK: - Private: Books

    private func loadBooksFirstPage() {
        bookCancellables.removeAll()
        books = []
        bookCursor = nil
        hasMoreBooks = true
        isBookLoading = true
        bookError = nil

        if isGenreFilterActive {
            performGenreFilter()
        } else {
            subscribeToBookPage(cursor: nil)
        }
    }

    private func performGenreFilter() {
        hasMoreBooks = false
        let genreIds = Array(selectedGenreIds)

        bookRepository.subscribeToFilteredBooks(genreIds: genreIds, sort: bookSortOption.rawValue)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("genreFilter FAILED: \(error.localizedDescription)")
                        self?.bookError = userFacingMessage(from: error, fallback: "Unable to load your library")
                        self?.isBookLoading = false
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] results in
                    self?.books = results
                    self?.isBookLoading = false
                }
            )
            .store(in: &bookCancellables)
    }

    private func subscribeToBookPage(cursor: String?) {
        logger.info("subscribeToBookPage: sort=\(self.bookSortOption.rawValue), cursor=\(cursor ?? "nil")")

        bookRepository.subscribeToBookList(
            sort: bookSortOption.rawValue,
            numItems: 20,
            cursor: cursor
        )?
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.logger.error("bookList FAILED: \(error.localizedDescription)")
                    self?.bookError = userFacingMessage(from: error, fallback: "Unable to load your library")
                    self?.isBookLoading = false
                    self?.isLoadingMore = false
                    self?.authObserver.needsResubscription()
                }
            },
            receiveValue: { [weak self] result in
                guard let self else { return }
                if cursor == nil {
                    self.books = result.page
                } else {
                    let existingIds = Set(self.books.map(\._id))
                    let newItems = result.page.filter { !existingIds.contains($0._id) }
                    self.books.append(contentsOf: newItems)
                }
                self.bookCursor = result.isDone ? nil : result.continueCursor
                self.hasMoreBooks = !result.isDone
                self.isBookLoading = false
                self.isLoadingMore = false
            }
        )
        .store(in: &bookCancellables)
    }

    // MARK: - Private: Authors

    private func loadAuthorsFirstPage() {
        authorCancellables.removeAll()
        authors = []
        authorCursor = nil
        hasMoreAuthors = true
        isAuthorLoading = true
        authorError = nil
        subscribeToAuthorPage(cursor: nil)
    }

    private func subscribeToAuthorPage(cursor: String?) {
        logger.info("subscribeToAuthorPage: sort=\(self.authorSortOption.rawValue), cursor=\(cursor ?? "nil")")

        authorRepository.subscribeToAuthorList(
            sort: authorSortOption.rawValue,
            numItems: 20,
            cursor: cursor
        )?
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let error) = completion {
                    self?.logger.error("authorList FAILED: \(error.localizedDescription)")
                    self?.authorError = userFacingMessage(from: error, fallback: "Unable to load authors")
                    self?.isAuthorLoading = false
                    self?.isLoadingMoreAuthors = false
                    self?.authObserver.needsResubscription()
                }
            },
            receiveValue: { [weak self] result in
                guard let self else { return }
                if cursor == nil {
                    self.authors = result.page
                } else {
                    let existingIds = Set(self.authors.map(\._id))
                    let newItems = result.page.filter { !existingIds.contains($0._id) }
                    self.authors.append(contentsOf: newItems)
                }
                self.authorCursor = result.isDone ? nil : result.continueCursor
                self.hasMoreAuthors = !result.isDone
                self.isAuthorLoading = false
                self.isLoadingMoreAuthors = false
            }
        )
        .store(in: &authorCancellables)
    }

    // MARK: - Private: Series

    private func loadSeries() {
        isSeriesLoading = true
        seriesError = nil
        seriesCancellables.removeAll()

        guard authObserver.isAuthenticated else {
            isSeriesLoading = false
            return
        }

        let pub: AnyPublisher<[SeriesWithPreview], ClientError> = ConvexService.shared.subscribe(
            to: "series/queries:listSeriesWithPreviews",
            with: [:]
        )

        pub
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("series browse FAILED: \(error.localizedDescription)")
                        self?.seriesError = userFacingMessage(from: error, fallback: "Unable to load series")
                        self?.isSeriesLoading = false
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] series in
                    self?.seriesList = series
                    self?.isSeriesLoading = false
                }
            )
            .store(in: &seriesCancellables)
    }

    // MARK: - Private: Shelves

    private func loadShelves() {
        isShelvesLoading = true
        shelvesError = nil
        shelfCancellables.removeAll()

        shelfRepository.subscribeToMyShelves()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("shelves FAILED: \(error.localizedDescription)")
                        self?.shelvesError = userFacingMessage(from: error, fallback: "Unable to load bookshelves")
                        self?.isShelvesLoading = false
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] shelves in
                    self?.shelves = shelves
                    self?.isShelvesLoading = false
                }
            )
            .store(in: &shelfCancellables)
    }

    // MARK: - Private: Unified Search

    private func performUnifiedSearch() {
        unifiedCancellables.removeAll()
        unifiedSearchError = nil

        let query = searchText.trimmingCharacters(in: .whitespaces)
        guard !query.isEmpty else {
            isUnifiedSearchLoading = false
            return
        }

        guard authObserver.isAuthenticated else {
            isUnifiedSearchLoading = false
            return
        }

        guard let pub = searchRepository.subscribeToUnifiedSearch(query: query) else {
            isUnifiedSearchLoading = false
            return
        }

        logger.info("performUnifiedSearch: query='\(query)'")

        pub
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("unified search FAILED: \(error.localizedDescription)")
                        self?.unifiedSearchError = userFacingMessage(
                            from: error,
                            fallback: "Search isn't available right now"
                        )
                        self?.isUnifiedSearchLoading = false
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] result in
                    self?.logger.info("unified search: \(result.books.count) books, \(result.authors.count) authors, \(result.series?.count ?? 0) series")
                    self?.unifiedBooks = result.books
                    self?.unifiedAuthors = result.authors
                    self?.unifiedSeries = result.series ?? []
                    self?.isUnifiedSearchLoading = false
                }
            )
            .store(in: &unifiedCancellables)
    }

    // MARK: - Offline

    private func loadOfflineBooks() {
        guard let dm = downloadManager else {
            isBookLoading = false
            return
        }

        let offlineBooks = dm.downloadedBooks
            .filter(\.isComplete)
            .compactMap { dm.offlinePlaybackData(for: $0.bookId)?.0 }
            .sorted { $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending }

        books = offlineBooks
        hasMoreBooks = false
        isBookLoading = false
    }
}
