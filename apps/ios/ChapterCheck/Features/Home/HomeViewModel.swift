import Combine
import ConvexMobile
import Foundation
import os

/// View model for the home screen.
///
/// Manages four concurrent Convex subscriptions for real-time updates:
/// continue listening, recently added books, top rated books, and user shelves.
///
/// Observes Convex auth state — subscriptions are only created when authenticated
/// and automatically torn down / recreated on auth state transitions.
/// A full-screen error only appears when ALL sections fail — partial successes
/// show whatever data loaded.
@Observable
@MainActor
final class HomeViewModel {

    // MARK: - State

    var recentlyListening: [RecentListeningProgress] = []
    var recentBooks: [BookWithDetails] = []
    var topRatedBooks: [BookWithDetails] = []
    var myShelves: [Shelf] = []

    var isLoading = true
    var showRetry = false
    var error: String?

    // MARK: - Dependencies

    private let logger = Logger(subsystem: "com.chaptercheck", category: "HomeViewModel")
    private let bookRepository = BookRepository()
    private let progressRepository = ProgressRepository()
    private let shelfRepository = ShelfRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    /// Tracks which subscriptions have emitted at least once,
    /// so we can dismiss the loading state after initial data arrives.
    private var loadedSections: Set<String> = []
    private var failedSections: Set<String> = []
    private var retryTimer: Task<Void, Never>?

    private static let allSections: Set<String> = ["recentlyListening", "recentBooks", "topRatedBooks", "myShelves"]

    // MARK: - Subscriptions

    func subscribe() {
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("Auth ready — subscribing to all home sections")
                subscribeToRecentlyListening()
                subscribeToRecentBooks()
                subscribeToTopRatedBooks()
                subscribeToMyShelves()
                startRetryTimer()
            },
            onUnauthenticated: { [weak self] in
                guard let self else { return }
                logger.info("Auth lost — tearing down subscriptions")
                tearDownSubscriptions()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        tearDownSubscriptions()
    }

    func retry() {
        logger.info("Manual retry triggered")
        isLoading = true
        showRetry = false
        error = nil
        tearDownSubscriptions()
        authObserver.cancel()
        subscribe()
    }

    private func tearDownSubscriptions() {
        cancellables.removeAll()
        retryTimer?.cancel()
        retryTimer = nil
        loadedSections.removeAll()
        failedSections.removeAll()
    }

    // MARK: - Private Subscription Setup

    private func subscribeToRecentlyListening() {
        progressRepository.subscribeToRecentlyListening(limit: 6)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("recentlyListening FAILED: \(error)")
                        self?.handleSectionError("recentlyListening", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] items in
                    self?.logger.info("recentlyListening: received \(items.count) items")
                    self?.recentlyListening = items
                    self?.markLoaded("recentlyListening")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToRecentBooks() {
        bookRepository.subscribeToRecentBooks(limit: 10)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("recentBooks FAILED: \(error)")
                        self?.handleSectionError("recentBooks", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] books in
                    self?.logger.info("recentBooks: received \(books.count) books")
                    self?.recentBooks = books
                    self?.markLoaded("recentBooks")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToTopRatedBooks() {
        bookRepository.subscribeToTopRatedBooks(limit: 10)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("topRatedBooks FAILED: \(error)")
                        self?.handleSectionError("topRatedBooks", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] books in
                    self?.logger.info("topRatedBooks: received \(books.count) books")
                    self?.topRatedBooks = books
                    self?.markLoaded("topRatedBooks")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToMyShelves() {
        shelfRepository.subscribeToMyShelves()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("myShelves FAILED: \(error)")
                        self?.handleSectionError("myShelves", message: error.localizedDescription)
                    }
                },
                receiveValue: { [weak self] shelves in
                    self?.logger.info("myShelves: received \(shelves.count) shelves")
                    self?.myShelves = shelves
                    self?.markLoaded("myShelves")
                }
            )
            .store(in: &cancellables)
    }

    private func markLoaded(_ section: String) {
        loadedSections.insert(section)
        // Any successful section clears the error — show partial content
        error = nil
        if loadedSections.count >= 1 {
            isLoading = false
            retryTimer?.cancel()
            retryTimer = nil
        }
    }

    private func handleSectionError(_ section: String, message: String) {
        failedSections.insert(section)
        // Only show full-screen error if ALL sections failed and none loaded
        if failedSections.union(loadedSections) == Self.allSections {
            if loadedSections.isEmpty {
                error = message
                // All subscriptions dead — allow re-subscription on next auth cycle
                cancellables.removeAll()
                authObserver.needsResubscription()
            }
            isLoading = false
            retryTimer?.cancel()
            retryTimer = nil
        }
    }

    private func startRetryTimer() {
        retryTimer?.cancel()
        retryTimer = Task { [weak self] in
            try? await Task.sleep(for: .seconds(4))
            guard !Task.isCancelled else { return }
            self?.showRetry = true
        }
    }
}
