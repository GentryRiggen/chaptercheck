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

    var downloadManager: DownloadManager?
    private let networkMonitor = NetworkMonitor.shared
    var isOffline: Bool { !networkMonitor.isConnected }
    private(set) var isShowingOfflineData = false

    private let logger = Logger(subsystem: "com.chaptercheck", category: "AuthorsViewModel")
    private let authorRepository = AuthorRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Pagination State

    private var currentCursor: String?
    private var isSearchMode: Bool { !searchText.trimmingCharacters(in: .whitespaces).isEmpty }

    // MARK: - Debounce

    private var searchDebounceTask: Task<Void, Never>?
    private static let searchDebounceDelay: Duration = .milliseconds(300)

    // MARK: - Lifecycle

    func subscribe() {
        if isOffline {
            isShowingOfflineData = true
            loadOfflineAuthors()
            return
        }

        isShowingOfflineData = false
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

    func refresh() async {
        unsubscribe()
        isLoading = true
        error = nil
        subscribe()
        while isLoading && !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    /// Transition from offline data to live Convex subscriptions.
    func recoverFromOffline() {
        guard isShowingOfflineData else { return }
        isShowingOfflineData = false

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                loadFirstPage()
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
            }
        )
        authObserver.needsResubscription()
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
                        self?.error = userFacingMessage(from: error, fallback: "Unable to load authors")
                        self?.isLoading = false
                        self?.authObserver.needsResubscription()
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
                        self?.error = userFacingMessage(from: error, fallback: "Unable to load authors")
                        self?.isLoading = false
                        self?.isLoadingMore = false
                        self?.authObserver.needsResubscription()
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

    // MARK: - Offline

    private func loadOfflineAuthors() {
        guard let dm = downloadManager else {
            isLoading = false
            return
        }

        // Extract unique authors from downloaded books
        let completedBooks = dm.downloadedBooks.filter(\.isComplete)
        var authorMap: [String: (name: String, bookCount: Int)] = [:]
        for info in completedBooks {
            for name in info.authorNames {
                let key = name.lowercased()
                if var existing = authorMap[key] {
                    existing.bookCount += 1
                    authorMap[key] = existing
                } else {
                    authorMap[key] = (name: name, bookCount: 1)
                }
            }
        }

        let now = Date().timeIntervalSince1970 * 1000
        authors = authorMap.map { key, value in
            AuthorWithCounts(
                _id: "offline-author-\(key)",
                _creationTime: now,
                name: value.name,
                bio: nil,
                imageR2Key: nil,
                createdAt: now,
                updatedAt: now,
                bookCount: Double(value.bookCount),
                seriesCount: 0
            )
        }
        .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending }

        hasMore = false
        isLoading = false
    }
}
