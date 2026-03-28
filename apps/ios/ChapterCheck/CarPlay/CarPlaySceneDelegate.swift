import CarPlay
import Combine
import ConvexMobile

/// Manages the CarPlay scene lifecycle and template hierarchy.
///
/// Presents a `CPTabBarTemplate` with:
/// - **Continue Listening** — recently listened books with progress
/// - **Library** — all books sorted alphabetically
/// - **Downloads** — offline-available books
///
/// Each tab uses `CPListTemplate`. Selecting a book starts playback via
/// `AudioPlayerManager` and navigates to `CPNowPlayingTemplate`.
///
/// Data flows through the existing repository layer (ProgressRepository,
/// BookRepository) using Combine subscriptions — same real-time pipeline
/// as the main app.
@MainActor
final class CarPlaySceneDelegate: UIResponder, @preconcurrency CPTemplateApplicationSceneDelegate {

    private let logger = AppLogger(category: "CarPlay")

    private var interfaceController: CPInterfaceController?
    private var cancellables = Set<AnyCancellable>()

    // Repositories for data
    private let progressRepository = ProgressRepository()
    private let bookRepository = BookRepository()
    private let audioRepository = AudioRepository()

    // Cached data for building templates
    private var recentlyListening: [RecentListeningProgress] = []
    private var libraryBooks: [BookWithDetails] = []

    // Track the tab bar so we can update individual tabs
    private var tabBarTemplate: CPTabBarTemplate?
    private var continueListeningTemplate: CPListTemplate?
    private var libraryTemplate: CPListTemplate?
    private var downloadsTemplate: CPListTemplate?

    private let authObserver = ConvexAuthObserver()

    /// Timeout for fetching book/audio data before starting playback.
    private static let playbackLoadTimeout: UInt64 = 10_000_000_000 // 10 seconds

    // MARK: - CPTemplateApplicationSceneDelegate

    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didConnect interfaceController: CPInterfaceController
    ) {
        logger.info("CarPlay connected")
        self.interfaceController = interfaceController

        let continueTab = makeContinueListeningTemplate()
        let libraryTab = makeLibraryTemplate()
        let downloadsTab = makeDownloadsTemplate()

        self.continueListeningTemplate = continueTab
        self.libraryTemplate = libraryTab
        self.downloadsTemplate = downloadsTab

        let tabBar = CPTabBarTemplate(templates: [continueTab, libraryTab, downloadsTab])
        self.tabBarTemplate = tabBar

        interfaceController.setRootTemplate(tabBar, animated: false, completion: nil)

        subscribeToData()
    }

    // MARK: - Template Construction

    private func makeContinueListeningTemplate() -> CPListTemplate {
        let template = CPListTemplate(title: "Continue Listening", sections: [])
        template.tabImage = UIImage(systemName: "play.circle")
        template.emptyViewTitleVariants = ["No Books In Progress"]
        template.emptyViewSubtitleVariants = ["Start listening to see your books here"]
        return template
    }

    private func makeLibraryTemplate() -> CPListTemplate {
        let template = CPListTemplate(title: "Library", sections: [])
        template.tabImage = UIImage(systemName: "books.vertical")
        template.emptyViewTitleVariants = ["No Books"]
        template.emptyViewSubtitleVariants = ["Add books to your library to see them here"]
        return template
    }

    private func makeDownloadsTemplate() -> CPListTemplate {
        let template = CPListTemplate(title: "Downloads", sections: [])
        template.tabImage = UIImage(systemName: "arrow.down.circle")
        template.emptyViewTitleVariants = ["No Downloads"]
        template.emptyViewSubtitleVariants = ["Download books for offline listening"]
        return template
    }

    // MARK: - Data Subscriptions

    private func subscribeToData() {
        authObserver.start(
            onAuthenticated: { [weak self] in
                self?.logger.info("CarPlay auth ready — subscribing")
                self?.startSubscriptions()
            },
            onUnauthenticated: { [weak self] in
                self?.logger.info("CarPlay auth lost — clearing")
                self?.cancellables.removeAll()
                self?.recentlyListening = []
                self?.libraryBooks = []
                self?.updateContinueListeningSection()
                self?.updateLibrarySection()
            }
        )
    }

    private func startSubscriptions() {
        cancellables.removeAll()

        // Continue Listening
        if let publisher = progressRepository.subscribeToRecentlyListening(limit: 20) {
            publisher
                .receive(on: DispatchQueue.main)
                .sink(
                    receiveCompletion: { [weak self] completion in
                        if case .failure(let error) = completion {
                            self?.logger.error("CarPlay continue listening error: \(error.localizedDescription)")
                        }
                    },
                    receiveValue: { [weak self] items in
                        self?.recentlyListening = items
                        self?.updateContinueListeningSection()
                    }
                )
                .store(in: &cancellables)
        }

        // Library — subscribe to recent books (limited set for CarPlay)
        if let publisher = bookRepository.subscribeToRecentBooks(limit: 50) {
            publisher
                .receive(on: DispatchQueue.main)
                .sink(
                    receiveCompletion: { [weak self] completion in
                        if case .failure(let error) = completion {
                            self?.logger.error("CarPlay library error: \(error.localizedDescription)")
                        }
                    },
                    receiveValue: { [weak self] books in
                        self?.libraryBooks = books
                        self?.updateLibrarySection()
                    }
                )
                .store(in: &cancellables)
        }

        // Downloads — update from DownloadManager on main actor
        updateDownloadsSection()
    }

    // MARK: - Template Updates

    private func updateContinueListeningSection() {
        let items: [CPListItem] = recentlyListening.map { progress in
            let authorNames = progress.book.authors.map(\.name).joined(separator: ", ")
            let subtitle = authorNames.isEmpty
                ? progress.formattedProgress
                : "\(authorNames) — \(progress.formattedProgress)"

            let item = CPListItem(text: progress.book.title, detailText: subtitle)
            item.handler = { [weak self] _, completion in
                self?.handleBookSelection(progress: progress, completion: completion)
            }

            if let coverKey = progress.book.coverImageR2Key {
                loadCoverImage(r2Key: coverKey) { image in
                    item.setImage(image)
                }
            }

            return item
        }

        let section = CPListSection(items: items)
        continueListeningTemplate?.updateSections([section])
    }

    private func updateLibrarySection() {
        let sortedBooks = libraryBooks.sorted {
            $0.title.localizedCaseInsensitiveCompare($1.title) == .orderedAscending
        }

        let items: [CPListItem] = sortedBooks.map { book in
            let authorNames = book.authors.map(\.name).joined(separator: ", ")
            let parts = [
                authorNames.isEmpty ? nil : authorNames,
                book.formattedDuration,
            ].compactMap { $0 }
            let subtitle = parts.joined(separator: " — ")

            let item = CPListItem(text: book.title, detailText: subtitle.isEmpty ? nil : subtitle)
            item.handler = { [weak self] _, completion in
                self?.handleLibraryBookSelection(book: book, completion: completion)
            }

            if let coverKey = book.coverImageR2Key {
                loadCoverImage(r2Key: coverKey) { image in
                    item.setImage(image)
                }
            }

            return item
        }

        let section = CPListSection(items: items)
        libraryTemplate?.updateSections([section])
    }

    private func updateDownloadsSection() {
        guard let downloadManager = SharedState.downloadManager else {
            downloadsTemplate?.updateSections([])
            return
        }

        let downloadedBooks = downloadManager.downloadedBooks

        let items: [CPListItem] = downloadedBooks.map { info in
            let authorNames = info.authorNames.joined(separator: ", ")
            let parts = [
                authorNames.isEmpty ? nil : authorNames,
                info.formattedSize,
            ].compactMap { $0 }
            let subtitle = parts.joined(separator: " — ")

            let item = CPListItem(text: info.bookTitle, detailText: subtitle.isEmpty ? nil : subtitle)
            item.handler = { [weak self] _, completion in
                self?.handleDownloadedBookSelection(bookId: info.bookId, completion: completion)
            }

            if let coverKey = info.coverImageR2Key {
                loadCoverImage(r2Key: coverKey) { image in
                    item.setImage(image)
                }
            }

            return item
        }

        let section = CPListSection(items: items)
        downloadsTemplate?.updateSections([section])
    }

    // MARK: - Book Selection Handlers

    private func handleBookSelection(
        progress: RecentListeningProgress,
        completion: @escaping () -> Void
    ) {
        Task {
            defer { completion() }

            let audioPlayer = SharedState.audioPlayer

            // If this book is already loaded, just resume and show now playing
            if audioPlayer.currentBook?._id == progress.bookId {
                if !audioPlayer.isPlaying {
                    audioPlayer.resume()
                }
                pushNowPlaying()
                return
            }

            let success = await startPlayback(
                bookId: progress.bookId,
                audioFileId: progress.audioFile._id,
                position: progress.positionSeconds,
                rate: progress.playbackRate,
                audioPlayer: audioPlayer
            )
            if success {
                pushNowPlaying()
            }
        }
    }

    private func handleLibraryBookSelection(
        book: BookWithDetails,
        completion: @escaping () -> Void
    ) {
        Task {
            defer { completion() }

            let audioPlayer = SharedState.audioPlayer

            if audioPlayer.currentBook?._id == book._id {
                if !audioPlayer.isPlaying {
                    audioPlayer.resume()
                }
                pushNowPlaying()
                return
            }

            let success = await startPlayback(
                bookId: book._id,
                audioFileId: nil,
                position: 0,
                rate: audioPlayer.playbackRate,
                audioPlayer: audioPlayer
            )
            if success {
                pushNowPlaying()
            }
        }
    }

    private func handleDownloadedBookSelection(
        bookId: String,
        completion: @escaping () -> Void
    ) {
        Task {
            defer { completion() }

            let audioPlayer = SharedState.audioPlayer

            if audioPlayer.currentBook?._id == bookId {
                if !audioPlayer.isPlaying {
                    audioPlayer.resume()
                }
                pushNowPlaying()
                return
            }

            let success = await startPlayback(
                bookId: bookId,
                audioFileId: nil,
                position: 0,
                rate: audioPlayer.playbackRate,
                audioPlayer: audioPlayer
            )
            if success {
                pushNowPlaying()
            }
        }
    }

    // MARK: - Playback

    /// Fetches audio files for a book and starts playback.
    /// Returns `true` if playback was started, `false` on failure.
    @discardableResult
    private func startPlayback(
        bookId: String,
        audioFileId: String?,
        position: Double,
        rate: Double,
        audioPlayer: AudioPlayerManager
    ) async -> Bool {
        // Fetch book and audio files with a timeout
        let book: BookWithDetails?
        let audioFiles: [AudioFile]

        do {
            let bookPublisher = bookRepository.subscribeToBook(id: bookId)
            // subscribeToBook returns AnyPublisher<BookWithDetails?, ...>? so fetchFirst
            // returns BookWithDetails?? — flatten both optionals.
            let maybeBook: BookWithDetails?? = try await withTimeout(Self.playbackLoadTimeout) {
                await self.fetchFirst(from: bookPublisher)
            }
            book = maybeBook ?? nil

            let filesPublisher = audioRepository.subscribeToAudioFiles(bookId: bookId)
            let fetchedFiles: [AudioFile]? = try await withTimeout(Self.playbackLoadTimeout) {
                await self.fetchFirst(from: filesPublisher)
            }
            audioFiles = fetchedFiles ?? []
        } catch {
            logger.error("Timed out loading book \(bookId) for CarPlay")
            showPlaybackError("Couldn't load book. Check your connection and try again.")
            return false
        }

        guard let book else {
            logger.error("Could not fetch book \(bookId) for CarPlay playback")
            showPlaybackError("Couldn't find this book.")
            return false
        }

        guard !audioFiles.isEmpty else {
            logger.error("No audio files found for book \(bookId)")
            showPlaybackError("No audio files available for this book.")
            return false
        }

        let targetFile = audioFiles.first(where: { $0._id == audioFileId }) ?? audioFiles.first!

        audioPlayer.play(
            book: book,
            audioFile: targetFile,
            allFiles: audioFiles,
            startPosition: position,
            rate: rate
        )
        return true
    }

    /// Fetches the first emitted value from a Combine publisher, or `nil` if the
    /// publisher completes without emitting or if the publisher itself is `nil`.
    private func fetchFirst<T>(from publisher: AnyPublisher<T, ClientError>?) async -> T? {
        guard let publisher else { return nil }

        return await withCheckedContinuation { continuation in
            var resumed = false
            var sub: AnyCancellable?
            sub = publisher
                .first()
                .sink(
                    receiveCompletion: { _ in
                        if !resumed {
                            resumed = true
                            continuation.resume(returning: nil)
                        }
                        sub?.cancel()
                    },
                    receiveValue: { value in
                        if !resumed {
                            resumed = true
                            continuation.resume(returning: value)
                        }
                        sub?.cancel()
                    }
                )
        }
    }

    /// Runs an async closure with a timeout. Throws `CancellationError` if the timeout expires.
    private func withTimeout<T>(_ nanoseconds: UInt64, operation: @escaping @Sendable () async -> T) async throws -> T {
        try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask { await operation() }
            group.addTask {
                try await Task.sleep(nanoseconds: nanoseconds)
                throw CancellationError()
            }
            let result = try await group.next()!
            group.cancelAll()
            return result
        }
    }

    // MARK: - Now Playing

    private func pushNowPlaying() {
        let nowPlaying = CPNowPlayingTemplate.shared
        if interfaceController?.topTemplate !== nowPlaying {
            interfaceController?.pushTemplate(nowPlaying, animated: true, completion: nil)
        }
    }

    // MARK: - Error Feedback

    private func showPlaybackError(_ message: String) {
        let alert = CPAlertTemplate(
            titleVariants: [message],
            actions: [CPAlertAction(title: "OK", style: .cancel) { _ in }]
        )
        interfaceController?.presentTemplate(alert, animated: true, completion: nil)
    }

    // MARK: - Cover Image Loading

    private func loadCoverImage(r2Key: String, completion: @escaping (UIImage) -> Void) {
        Task {
            guard let url = await ImageRepository.shared.getImageUrl(r2Key: r2Key) else { return }

            // Load UIImage from the URL (file:// from disk cache or https:// presigned)
            let image: UIImage?
            if url.isFileURL {
                image = UIImage(contentsOfFile: url.path)
            } else {
                guard let (data, _) = try? await URLSession.shared.data(from: url) else { return }
                image = UIImage(data: data)
            }

            guard let image else { return }

            // Scale down for CarPlay (Apple HIG recommends ~72–90pt for list items)
            let size = CGSize(width: 90, height: 90)
            let renderer = UIGraphicsImageRenderer(size: size)
            let scaled = renderer.image { _ in
                image.draw(in: CGRect(origin: .zero, size: size))
            }

            completion(scaled)
        }
    }
}

// Extension to silence "nearly matches" warning for didDisconnect vs didSelect.
extension CarPlaySceneDelegate {
    func templateApplicationScene(
        _ templateApplicationScene: CPTemplateApplicationScene,
        didDisconnect interfaceController: CPInterfaceController
    ) {
        logger.info("CarPlay disconnected")
        self.interfaceController = nil
        cancellables.removeAll()
        authObserver.cancel()
    }
}
