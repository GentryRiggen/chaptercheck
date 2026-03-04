import Combine
import ConvexMobile
import Foundation
import os

/// View model for the home screen.
///
/// Manages three concurrent Convex subscriptions for real-time updates:
/// continue listening, recently added books, and top rated books.
@Observable
@MainActor
final class HomeViewModel {

    // MARK: - State

    var recentlyListening: [RecentListeningProgress] = []
    var recentBooks: [BookWithDetails] = []
    var topRatedBooks: [BookWithDetails] = []

    var isLoading = true
    var showRetry = false
    var error: String?

    // MARK: - Dependencies

    private let logger = Logger(subsystem: "com.chaptercheck", category: "HomeViewModel")
    private let bookRepository = BookRepository()
    private let progressRepository = ProgressRepository()
    private var cancellables = Set<AnyCancellable>()

    /// Tracks which subscriptions have emitted at least once,
    /// so we can dismiss the loading state after initial data arrives.
    private var loadedSections: Set<String> = []
    private var retryTimer: Task<Void, Never>?

    // MARK: - Subscriptions

    func subscribe() {
        guard cancellables.isEmpty else { return }
        logger.info("Subscribing to all home sections")
        subscribeToRecentlyListening()
        subscribeToRecentBooks()
        subscribeToTopRatedBooks()
        startRetryTimer()
    }

    func unsubscribe() {
        cancellables.removeAll()
        retryTimer?.cancel()
        retryTimer = nil
    }

    func retry() {
        logger.info("Manual retry triggered")
        isLoading = true
        showRetry = false
        error = nil
        loadedSections.removeAll()
        cancellables.removeAll()
        subscribe()
    }

    // MARK: - Private Subscription Setup

    private func subscribeToRecentlyListening() {
        progressRepository.subscribeToRecentlyListening(limit: 6)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("recentlyListening FAILED: \(error)")
                        self?.handleError(error.localizedDescription)
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
                        self?.handleError(error.localizedDescription)
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
                        self?.handleError(error.localizedDescription)
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

    private func markLoaded(_ section: String) {
        loadedSections.insert(section)
        if loadedSections.count >= 1 {
            isLoading = false
            retryTimer?.cancel()
            retryTimer = nil
        }
    }

    private func handleError(_ message: String) {
        error = message
        isLoading = false
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
