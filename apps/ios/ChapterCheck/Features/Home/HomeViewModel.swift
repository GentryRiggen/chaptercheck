import Combine
import ConvexMobile
import Foundation
import os

/// View model for the home screen.
///
/// Manages concurrent Convex subscriptions for real-time updates:
/// continue listening, top rated books, and user shelves.
///
/// Observes Convex auth state — subscriptions are only created when authenticated
/// and automatically torn down / recreated on auth state transitions.
/// A full-screen error only appears when ALL sections fail — partial successes
/// show whatever data loaded.
///
/// When offline, skips Convex subscriptions and loads downloaded books from the
/// `DownloadManager` to populate the Continue Listening section.
@Observable
@MainActor
final class HomeViewModel {

    // MARK: - State

    var recentlyListening: [RecentListeningProgress] = []
    var topRatedBooks: [BookWithDetails] = []
    var myShelves: [Shelf] = []
    var listeningStats: ListeningStats?

    var isLoading = true
    var showRetry = false
    var error: String?

    // MARK: - Dependencies

    var downloadManager: DownloadManager?
    var audioPlayerManager: AudioPlayerManager!
    private let networkMonitor = NetworkMonitor.shared
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
    private var offlineLoadTask: Task<Void, Never>?

    private static let allSections: Set<String> = ["recentlyListening", "topRatedBooks", "myShelves", "listeningStats"]

    var isOffline: Bool { !networkMonitor.isConnected }

    /// Whether the ViewModel loaded from offline data (no Convex subscriptions).
    /// Used by the View to know when to trigger online recovery.
    private(set) var isShowingOfflineData = false

    // MARK: - Subscriptions

    func subscribe() {
        if isOffline {
            logger.info("Offline — loading downloaded books for continue listening")
            isShowingOfflineData = true
            loadOfflineData()
            return
        }

        isShowingOfflineData = false
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("Auth ready — subscribing to all home sections")
                subscribeToRecentlyListening()
                subscribeToTopRatedBooks()
                subscribeToMyShelves()
                subscribeToListeningStats()
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
        offlineLoadTask?.cancel()
        offlineLoadTask = nil
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

    func refresh() async {
        retry()
        while isLoading && !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    /// Transition from offline data to live Convex subscriptions.
    /// Uses `needsResubscription()` so the auth observer waits for a fresh
    /// `.authenticated` emission rather than firing on the stale cached state.
    func recoverFromOffline() {
        guard isShowingOfflineData else { return }
        logger.info("Network restored — switching from offline to live data")
        isShowingOfflineData = false
        offlineLoadTask?.cancel()
        offlineLoadTask = nil

        // Start the auth observer but force it to wait for a fresh auth cycle.
        // The Convex SDK will reconnect the WebSocket and re-authenticate,
        // emitting .loading → .authenticated which triggers onAuthenticated.
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("Auth ready after offline recovery — subscribing")
                subscribeToRecentlyListening()
                subscribeToTopRatedBooks()
                subscribeToMyShelves()
                subscribeToListeningStats()
                startRetryTimer()
            },
            onUnauthenticated: { [weak self] in
                guard let self else { return }
                logger.info("Auth lost — tearing down subscriptions")
                tearDownSubscriptions()
            }
        )
        authObserver.needsResubscription()
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
                        self?.handleSectionError("recentlyListening", message: userFacingMessage(from: error, fallback: "Unable to load your library"))
                    }
                },
                receiveValue: { [weak self] items in
                    self?.logger.info("recentlyListening: received \(items.count) items")
                    self?.recentlyListening = items
                    self?.markLoaded("recentlyListening")

                    Task { @MainActor in
                        guard let self else { return }
                        guard !self.audioPlayerManager.isSuppressingRemoteMerge else {
                            self.logger.debug("Skipping remote progress merge — suppressed during reconnection")
                            return
                        }
                        for item in items {
                            await PlaybackProgressStore.shared.mergeRemoteProgress(
                                bookId: item.bookId,
                                entry: item.cachedProgress
                            )
                        }
                    }
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
                        self?.handleSectionError("topRatedBooks", message: userFacingMessage(from: error, fallback: "Unable to load your library"))
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
                        self?.handleSectionError("myShelves", message: userFacingMessage(from: error, fallback: "Unable to load your library"))
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

    private func subscribeToListeningStats() {
        progressRepository.subscribeToListeningStats()?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("listeningStats FAILED: \(error)")
                        self?.handleSectionError("listeningStats", message: userFacingMessage(from: error, fallback: "Unable to load stats"))
                    }
                },
                receiveValue: { [weak self] stats in
                    self?.logger.info("listeningStats: received")
                    self?.listeningStats = stats
                    self?.markLoaded("listeningStats")
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

    // MARK: - Offline Data

    private func loadOfflineData() {
        guard let downloadManager else {
            isLoading = false
            return
        }

        let completedBooks = downloadManager.downloadedBooks.filter(\.isComplete)

        offlineLoadTask?.cancel()
        offlineLoadTask = Task {
            var items: [RecentListeningProgress] = []
            for info in completedBooks {
                let storedProgress = await PlaybackProgressStore.shared.progress(for: info.bookId)
                let cachedProgress = await downloadManager.cachedProgress(for: info.bookId)
                let cached = storedProgress ?? cachedProgress

                let authors = info.authorNames.map { name in
                    BookAuthorSummary(_id: "offline-\(name.hashValue)", name: name)
                }

                // Find the current audio file from cached progress or use the first one
                let sortedMeta = info.audioFileMetadata.sorted { ($0.partNumber ?? 0) < ($1.partNumber ?? 0) }
                let currentMeta: AudioFileMetadataEntry?
                if let cached {
                    currentMeta = sortedMeta.first(where: { $0.audioFileId == cached.audioFileId }) ?? sortedMeta.first
                } else {
                    currentMeta = sortedMeta.first
                }

                guard let meta = currentMeta else { continue }

                let totalDuration = sortedMeta.reduce(0.0) { $0 + $1.duration }
                let position = cached?.positionSeconds ?? 0
                let progressFraction: Double
                if totalDuration > 0 {
                    // Sum duration of completed parts + current position
                    let completedPartsDuration = sortedMeta
                        .filter { ($0.partNumber ?? 0) < (meta.partNumber ?? 0) }
                        .reduce(0.0) { $0 + $1.duration }
                    progressFraction = min((completedPartsDuration + position) / totalDuration, 1)
                } else {
                    progressFraction = 0
                }

                let item = RecentListeningProgress(
                    _id: info.bookId,
                    bookId: info.bookId,
                    book: RecentListeningBook(
                        title: info.bookTitle,
                        coverImageR2Key: info.coverImageR2Key,
                        seriesOrder: nil,
                        authors: authors,
                        series: nil
                    ),
                    audioFile: RecentListeningAudioFile(
                        _id: meta.audioFileId,
                        partNumber: meta.partNumber,
                        duration: meta.duration,
                        displayName: meta.displayName ?? meta.fileName
                    ),
                    positionSeconds: position,
                    playbackRate: cached?.playbackRate ?? 1.0,
                    progressFraction: progressFraction,
                    totalParts: Double(sortedMeta.count),
                    lastListenedAt: cached?.timestamp ?? 0
                )
                items.append(item)
            }

            // Sort by most recently listened (items with progress first, then by timestamp)
            items.sort { ($0.lastListenedAt) > ($1.lastListenedAt) }

            recentlyListening = items
            // Keep existing section data (stale Convex data) — only clear if truly empty
            // This preserves sections when going offline mid-session
            isLoading = false
        }
    }
}
