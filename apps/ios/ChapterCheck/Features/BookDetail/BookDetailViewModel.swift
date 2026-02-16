import Combine
import ConvexMobile
import Foundation

/// View model for the book detail screen.
///
/// Subscribes to five concurrent data sources for a given book:
/// book details, audio files, listening progress, user data (rating/review),
/// and rating statistics.
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

    var isLoading = true
    var error: String?

    // MARK: - Dependencies

    private let bookRepository = BookRepository()
    private let audioRepository = AudioRepository()
    private let progressRepository = ProgressRepository()
    private let bookUserDataRepository = BookUserDataRepository()
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

    /// Position in seconds to resume from.
    var resumePosition: Double {
        progress?.positionSeconds ?? 0
    }

    /// Playback rate from saved progress.
    var resumeRate: Double {
        progress?.playbackRate ?? 1.0
    }

    /// Formatted total book duration.
    var formattedDuration: String? {
        book?.formattedDuration
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
    }

    func unsubscribe() {
        cancellables.removeAll()
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

    private func markLoaded(_ section: String) {
        loadedSections.insert(section)
        if loadedSections.count >= 2 {
            isLoading = false
        }
    }
}
