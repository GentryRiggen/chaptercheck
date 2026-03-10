import Combine
import ConvexMobile
import Foundation

// MARK: - Supporting Types

/// Sort options for the review list.
///
/// Sorting is performed client-side since `getPublicReviewsForBook` returns
/// all reviews sorted by `reviewedAt` descending. The user's own review is
/// always pinned to the top regardless of sort order.
enum ReviewSortOption: String, CaseIterable, Identifiable {
    case recent = "recent"
    case oldest = "oldest"
    case highest = "highest"
    case lowest = "lowest"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .recent: return "Most Recent"
        case .oldest: return "Oldest First"
        case .highest: return "Highest Rated"
        case .lowest: return "Lowest Rated"
        }
    }
}

enum BookNotesFilterOption: String, CaseIterable, Identifiable {
    case all = "all"
    case recent = "recent"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .all: return "Timeline"
        case .recent: return "Recently Updated"
        }
    }
}

// MARK: - ViewModel

/// View model for the book detail screen.
///
/// Subscribes to seven concurrent data sources for a given book:
/// book details, audio files, listening progress, user data (rating/review),
/// rating statistics, public reviews, all genres, and the user's genre votes.
@Observable
@MainActor
final class BookDetailViewModel {

    // MARK: - Public State

    var book: BookWithDetails?
    var audioFiles: [AudioFile] = []
    var progress: ListeningProgress?
    private(set) var localProgress: CachedListeningProgress?
    var userData: BookUserData?
    var ratingStats: RatingStats?
    var reviews: [PublicReview] = []
    var allGenres: [Genre] = []
    var myGenreVoteIds: [String] = []
    var notes: [BookNote] = []
    var noteCategories: [NoteCategory] = []
    var selectedNoteCategoryId: String?
    var notesFilterOption: BookNotesFilterOption = .all
    var reviewSortOption: ReviewSortOption = .recent
    var currentUser: UserWithPermissions?
    var wantToReadStatus = WantToReadStatus(isOnWantToRead: false, shelfId: nil)

    var isLoading = true
    var error: String?
    private(set) var isShowingOfflineData = false

    // MARK: - Dependencies

    /// Optional download manager for warming the offline progress cache.
    var downloadManager: DownloadManager?

    private let networkMonitor = NetworkMonitor.shared
    var isOffline: Bool { !networkMonitor.isConnected }

    private let bookRepository = BookRepository()
    private let audioRepository = AudioRepository()
    private let progressRepository = ProgressRepository()
    private let bookUserDataRepository = BookUserDataRepository()
    private let shelfRepository = ShelfRepository()
    let genreRepository = GenreRepository()
    private let bookNotesRepository = BookNotesRepository()
    private let userRepository = UserRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()
    private var currentBookId: String?

    private var loadedSections: Set<String> = []

    // MARK: - Computed

    /// Whether the book has audio files available for playback.
    var hasAudioFiles: Bool {
        !audioFiles.isEmpty
    }

    var canUploadAudio: Bool {
        currentUser?.permissions.canUploadAudio == true
    }

    /// The audio file to resume from, based on saved progress.
    var resumeAudioFile: AudioFile? {
        guard let progress = resolvedProgress else {
            return audioFiles.first
        }
        return audioFiles.first(where: { $0._id == progress.audioFileId }) ?? audioFiles.first
    }

    /// Position in seconds to resume from, with smart rewind applied.
    func resumePosition(smartRewindEnabled: Bool) -> Double {
        guard let progress = resolvedProgress, progress.timestamp > 0 else { return 0 }
        return AudioPlayerManager.smartRewindPosition(
            from: progress.positionSeconds,
            lastListenedAt: progress.timestamp,
            enabled: smartRewindEnabled
        )
    }

    /// Playback rate from saved progress.
    var resumeRate: Double {
        resolvedProgress?.playbackRate ?? 1.0
    }

    /// Device-local playback progress wins over remote progress when newer.
    var resolvedProgress: CachedListeningProgress? {
        guard let localProgress else {
            return progress?.cachedProgress
        }
        guard let progress else { return localProgress }
        return localProgress.timestamp >= progress.lastListenedAt ? localProgress : progress.cachedProgress
    }

    /// Formatted total book duration.
    var formattedDuration: String? {
        book?.formattedDuration
    }

    /// Whether the current user has written a review for this book.
    var userHasReview: Bool {
        userData?.isRead == true && (userData?.reviewText != nil || userData?.rating != nil)
    }

    /// Reviews sorted according to `reviewSortOption`, with the user's own
    /// review pinned at the top regardless of sort order.
    var sortedReviews: [PublicReview] {
        let ownReview = reviews.first(where: { $0.isOwnReview == true })
        let otherReviews = reviews.filter { $0.isOwnReview != true }

        let sorted: [PublicReview]
        switch reviewSortOption {
        case .recent:
            sorted = otherReviews.sorted { ($0.reviewedAt ?? 0) > ($1.reviewedAt ?? 0) }
        case .oldest:
            sorted = otherReviews.sorted { ($0.reviewedAt ?? 0) < ($1.reviewedAt ?? 0) }
        case .highest:
            sorted = otherReviews.sorted { ($0.rating ?? 0) > ($1.rating ?? 0) }
        case .lowest:
            sorted = otherReviews.sorted { ($0.rating ?? 0) < ($1.rating ?? 0) }
        }

        if let own = ownReview {
            return [own] + sorted
        }
        return sorted
    }

    var filteredNotes: [BookNote] {
        let byCategory = notes.filter { note in
            guard let selectedNoteCategoryId else { return true }
            return note.category?._id == selectedNoteCategoryId
        }

        switch notesFilterOption {
        case .all:
            return byCategory.sorted { lhs, rhs in
                let lhsPart = lhs.audioFile.partNumber ?? 0
                let rhsPart = rhs.audioFile.partNumber ?? 0
                if lhsPart != rhsPart {
                    return lhsPart < rhsPart
                }
                return lhs.startSeconds < rhs.startSeconds
            }
        case .recent:
            return byCategory.sorted { $0.updatedAt > $1.updatedAt }
        }
    }

    // MARK: - Lifecycle

    func subscribe(bookId: String) {
        currentBookId = bookId
        refreshLocalProgress(bookId: bookId)

        // Offline: load from download manifest if available
        if isOffline {
            isShowingOfflineData = true
            loadFromManifest(bookId: bookId)
            return
        }

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty, let bookId = currentBookId else { return }
                subscribeToBook(bookId: bookId)
                subscribeToAudioFiles(bookId: bookId)
                subscribeToProgress(bookId: bookId)
                subscribeToUserData(bookId: bookId)
                subscribeToWantToReadStatus(bookId: bookId)
                subscribeToRatingStats(bookId: bookId)
                subscribeToReviews(bookId: bookId)
                subscribeToAllGenres()
                subscribeToMyGenreVotes(bookId: bookId)
                subscribeToNotes(bookId: bookId)
                subscribeToNoteCategories()
                subscribeToCurrentUser()
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
                self?.loadedSections.removeAll()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
    }

    /// Transition from offline manifest data to live Convex subscriptions.
    func recoverFromOffline() {
        guard isShowingOfflineData, currentBookId != nil else { return }
        isShowingOfflineData = false
        error = nil
        if let currentBookId {
            refreshLocalProgress(bookId: currentBookId)
        }

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty, let bookId = currentBookId else { return }
                subscribeToBook(bookId: bookId)
                subscribeToAudioFiles(bookId: bookId)
                subscribeToProgress(bookId: bookId)
                subscribeToUserData(bookId: bookId)
                subscribeToWantToReadStatus(bookId: bookId)
                subscribeToRatingStats(bookId: bookId)
                subscribeToReviews(bookId: bookId)
                subscribeToAllGenres()
                subscribeToMyGenreVotes(bookId: bookId)
                subscribeToNotes(bookId: bookId)
                subscribeToNoteCategories()
                subscribeToCurrentUser()
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
                self?.loadedSections.removeAll()
            }
        )
        authObserver.needsResubscription()
    }

    // MARK: - Mutations

    /// Toggle the read status for this book.
    ///
    /// The backend toggles the current `isRead` state. After a successful toggle
    /// the real-time `userData` subscription will emit the updated value automatically.
    func markAsRead() async {
        guard let book else { return }
        do {
            _ = try await bookUserDataRepository.markAsRead(bookId: book._id)
            Haptics.success()
        } catch {
            self.error = "Failed to update read status"
        }
    }

    /// Save a full review (rating, text, privacy, and genre votes) for this book.
    ///
    /// Genre votes are saved independently via `GenreRepository`. If either call
    /// fails, the error message is surfaced on the view.
    func saveReview(_ formData: ReviewFormData) async {
        guard let book else { return }
        var errors: [String] = []

        do {
            try await bookUserDataRepository.saveReview(
                bookId: book._id,
                rating: formData.rating,
                reviewText: formData.reviewText.isEmpty ? nil : formData.reviewText,
                isReadPrivate: formData.isReadPrivate,
                isReviewPrivate: formData.isReviewPrivate
            )
        } catch {
            errors.append("review")
        }

        do {
            try await genreRepository.setGenreVotes(
                bookId: book._id,
                genreIds: formData.genreIds
            )
        } catch {
            errors.append("genre votes")
        }

        if errors.isEmpty {
            Haptics.success()
        } else {
            self.error = "Failed to save \(errors.joined(separator: " and "))"
        }
    }

    func createCategory(name: String, colorToken: String) async throws -> String {
        try await bookNotesRepository.createCategory(name: name, colorToken: colorToken)
    }

    func createNote(
        audioFileId: String,
        categoryId: String?,
        startSeconds: Double,
        endSeconds: Double,
        noteText: String?
    ) async throws {
        guard let book else { return }
        try await bookNotesRepository.createNote(
            bookId: book._id,
            audioFileId: audioFileId,
            categoryId: categoryId,
            startSeconds: startSeconds,
            endSeconds: endSeconds,
            noteText: noteText
        )
    }

    func updateNote(
        noteId: String,
        audioFileId: String,
        categoryId: String?,
        startSeconds: Double,
        endSeconds: Double,
        noteText: String?
    ) async throws {
        try await bookNotesRepository.updateNote(
            noteId: noteId,
            audioFileId: audioFileId,
            categoryId: categoryId,
            startSeconds: startSeconds,
            endSeconds: endSeconds,
            noteText: noteText
        )
    }

    func deleteNote(noteId: String) async throws {
        try await bookNotesRepository.deleteNote(noteId: noteId)
    }

    func toggleWantToRead() async {
        guard let book else { return }
        do {
            let result = try await shelfRepository.toggleWantToRead(bookId: book._id)
            wantToReadStatus = WantToReadStatus(
                isOnWantToRead: result.isOnWantToRead,
                shelfId: result.shelfId
            )
            Haptics.success()
        } catch {
            self.error = "Failed to update Want to Read"
        }
    }

    // MARK: - Private Subscriptions

    private func subscribeToBook(bookId: String) {
        bookRepository.subscribeToBook(id: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] book in
                    self?.book = book
                    self?.markLoaded("book")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToAudioFiles(bookId: String) {
        audioRepository.subscribeToAudioFiles(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] files in
                    self?.audioFiles = files
                    self?.markLoaded("audioFiles")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToProgress(bookId: String) {
        progressRepository.subscribeToProgress(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] progress in
                    self?.progress = progress
                    self?.markLoaded("progress")
                    Task {
                        if let progress {
                            await PlaybackProgressStore.shared.mergeRemoteProgress(
                                bookId: bookId,
                                entry: progress.cachedProgress
                            )
                        }
                        let localProgress = await PlaybackProgressStore.shared.progress(for: bookId)
                        await MainActor.run { [weak self] in
                            guard let self, self.currentBookId == bookId else { return }
                            self.localProgress = localProgress

                            guard
                                let localProgress,
                                let downloadManager = self.downloadManager,
                                downloadManager.isBookDownloaded(bookId)
                            else { return }

                            Task {
                                await downloadManager.updateCachedProgress(
                                    bookId: bookId,
                                    audioFileId: localProgress.audioFileId,
                                    positionSeconds: localProgress.positionSeconds,
                                    playbackRate: localProgress.playbackRate,
                                    timestamp: localProgress.timestamp
                                )
                            }
                        }
                    }
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToUserData(bookId: String) {
        bookUserDataRepository.subscribeToMyBookData(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] data in
                    self?.userData = data
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToWantToReadStatus(bookId: String) {
        shelfRepository.subscribeToWantToReadStatus(bookId: bookId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] status in
                    self?.wantToReadStatus = status
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToRatingStats(bookId: String) {
        bookUserDataRepository.subscribeToRatingStats(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] stats in
                    self?.ratingStats = stats
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToReviews(bookId: String) {
        bookUserDataRepository.subscribeToPublicReviews(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] reviews in
                    self?.reviews = reviews
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToAllGenres() {
        genreRepository.subscribeToAllGenres()?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] genres in
                    self?.allGenres = genres
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToMyGenreVotes(bookId: String) {
        genreRepository.subscribeToMyGenreVotes(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] voteIds in
                    self?.myGenreVoteIds = voteIds
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToNotes(bookId: String) {
        bookNotesRepository.subscribeToMyNotes(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] notes in
                    self?.notes = notes
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToNoteCategories() {
        bookNotesRepository.subscribeToMyCategories()?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] categories in
                    self?.noteCategories = categories
                    if let selectedId = self?.selectedNoteCategoryId,
                       !categories.contains(where: { $0._id == selectedId }) {
                        self?.selectedNoteCategoryId = nil
                    }
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToCurrentUser() {
        userRepository.subscribeToCurrentUser()?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] user in
                    self?.currentUser = user
                }
            )
            .store(in: &cancellables)
    }

    private func markLoaded(_ section: String) {
        loadedSections.insert(section)
        if loadedSections.count >= 2 {
            isLoading = false
        }
    }

    private func refreshLocalProgress(bookId: String) {
        Task {
            let localProgress = await PlaybackProgressStore.shared.progress(for: bookId)
            await MainActor.run { [weak self] in
                guard let self, self.currentBookId == bookId else { return }
                self.localProgress = localProgress
            }
        }
    }

    // MARK: - Offline

    private func loadFromManifest(bookId: String) {
        guard let dm = downloadManager,
              let (offlineBook, offlineFiles) = dm.offlinePlaybackData(for: bookId) else {
            // Not downloaded — show limited info
            book = nil
            isLoading = false
            error = "Book details unavailable offline."
            return
        }

        book = offlineBook
        audioFiles = offlineFiles

        Task {
            let storedProgress = await PlaybackProgressStore.shared.progress(for: bookId)
            let cachedProgress = await dm.cachedProgress(for: bookId)
            let localProgress = storedProgress ?? cachedProgress

            await MainActor.run { [weak self] in
                guard let self, self.currentBookId == bookId else { return }
                self.localProgress = localProgress
            }
            isLoading = false
        }
    }
}
