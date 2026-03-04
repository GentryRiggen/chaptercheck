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
    var userData: BookUserData?
    var ratingStats: RatingStats?
    var reviews: [PublicReview] = []
    var allGenres: [Genre] = []
    var myGenreVoteIds: [String] = []
    var reviewSortOption: ReviewSortOption = .recent

    var isLoading = true
    var error: String?

    // MARK: - Dependencies

    /// Optional download manager for warming the offline progress cache.
    var downloadManager: DownloadManager?

    private let bookRepository = BookRepository()
    private let audioRepository = AudioRepository()
    private let progressRepository = ProgressRepository()
    private let bookUserDataRepository = BookUserDataRepository()
    private let genreRepository = GenreRepository()
    private var cancellables = Set<AnyCancellable>()

    private var loadedSections: Set<String> = []

    // MARK: - Computed

    /// Whether the book has audio files available for playback.
    var hasAudioFiles: Bool {
        !audioFiles.isEmpty
    }

    /// The audio file to resume from, based on saved progress.
    var resumeAudioFile: AudioFile? {
        guard let progress else {
            return audioFiles.first
        }
        return audioFiles.first(where: { $0._id == progress.audioFileId }) ?? audioFiles.first
    }

    /// Position in seconds to resume from, with smart rewind applied.
    func resumePosition(smartRewindEnabled: Bool) -> Double {
        guard let progress, progress.lastListenedAt > 0 else { return 0 }
        return AudioPlayerManager.smartRewindPosition(
            from: progress.positionSeconds,
            lastListenedAt: progress.lastListenedAt,
            enabled: smartRewindEnabled
        )
    }

    /// Playback rate from saved progress.
    var resumeRate: Double {
        progress?.playbackRate ?? 1.0
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

    // MARK: - Lifecycle

    func subscribe(bookId: String) {
        guard cancellables.isEmpty else { return }
        subscribeToBook(bookId: bookId)
        subscribeToAudioFiles(bookId: bookId)
        subscribeToProgress(bookId: bookId)
        subscribeToUserData(bookId: bookId)
        subscribeToRatingStats(bookId: bookId)
        subscribeToReviews(bookId: bookId)
        subscribeToAllGenres()
        subscribeToMyGenreVotes(bookId: bookId)
    }

    func unsubscribe() {
        cancellables.removeAll()
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

    // MARK: - Private Subscriptions

    private func subscribeToBook(bookId: String) {
        bookRepository.subscribeToBook(id: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.error = error.localizedDescription
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
                    }
                },
                receiveValue: { [weak self] progress in
                    self?.progress = progress
                    self?.markLoaded("progress")

                    // Warm the offline progress cache for downloaded books
                    if let progress, let dm = self?.downloadManager, dm.isBookDownloaded(bookId) {
                        Task {
                            await dm.updateCachedProgress(
                                bookId: bookId,
                                audioFileId: progress.audioFileId,
                                positionSeconds: progress.positionSeconds,
                                playbackRate: progress.playbackRate,
                                timestamp: progress.lastListenedAt
                            )
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

    private func markLoaded(_ section: String) {
        loadedSections.insert(section)
        if loadedSections.count >= 2 {
            isLoading = false
        }
    }
}
