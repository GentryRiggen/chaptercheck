import Combine
import Foundation

/// Lightweight ViewModel for the Now Playing details card.
///
/// Subscribes to per-book user data, rating stats, all genres, and the user's
/// genre votes — just enough to power the details card and review sheet.
@Observable
@MainActor
final class NowPlayingDetailsViewModel {

    // MARK: - Public State

    var userData: BookUserData?
    var ratingStats: RatingStats?
    var allGenres: [Genre] = []
    var myGenreVoteIds: [String] = []
    var noteTags: [MemoryTag] = []
    var currentUser: UserWithPermissions?
    var error: String?

    // MARK: - Dependencies

    private let bookUserDataRepository = BookUserDataRepository()
    let genreRepository = GenreRepository()
    private let userRepository = UserRepository()
    private let bookNotesRepository = BookNotesRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()
    private var currentBookId: String?

    // MARK: - Computed

    /// Whether the current user has marked the book as read.
    var isRead: Bool {
        userData?.isRead == true
    }

    /// Whether the current user has written a review for this book.
    var hasReview: Bool {
        isRead && (userData?.reviewText != nil || userData?.rating != nil)
    }

    // MARK: - Lifecycle

    func subscribe(bookId: String) {
        currentBookId = bookId
        cancellables.removeAll()
        authObserver.cancel()

        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, let bookId = currentBookId, cancellables.isEmpty else { return }
                self.setupSubscriptions(bookId: bookId)
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
        userData = nil
        ratingStats = nil
        allGenres = []
        myGenreVoteIds = []
        noteTags = []
        currentUser = nil
    }

    private func setupSubscriptions(bookId: String) {
        bookUserDataRepository.subscribeToMyBookData(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] data in
                    self?.userData = data
                }
            )
            .store(in: &cancellables)

        bookUserDataRepository.subscribeToRatingStats(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] stats in
                    self?.ratingStats = stats
                }
            )
            .store(in: &cancellables)

        genreRepository.subscribeToAllGenres()?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] genres in
                    self?.allGenres = genres
                }
            )
            .store(in: &cancellables)

        genreRepository.subscribeToMyGenreVotes(bookId: bookId)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] voteIds in
                    self?.myGenreVoteIds = voteIds
                }
            )
            .store(in: &cancellables)

        bookNotesRepository.subscribeToMyTags()?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [weak self] tags in
                    self?.noteTags = tags
                }
            )
            .store(in: &cancellables)

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

    // MARK: - Mutations

    /// Mark the current book as read.
    func markAsRead(bookId: String) async {
        do {
            _ = try await bookUserDataRepository.markAsRead(bookId: bookId)
            Haptics.success()
        } catch {
            self.error = "Failed to mark as read"
        }
    }

    /// Save a review for the current book. Mirrors `BookDetailViewModel.saveReview`.
    func saveReview(bookId: String, formData: ReviewFormData) async {
        var errors: [String] = []

        do {
            try await bookUserDataRepository.saveReview(
                bookId: bookId,
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
                bookId: bookId,
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

    func createTag(name: String) async throws -> String {
        try await bookNotesRepository.createTag(name: name)
    }

    func createNote(
        bookId: String,
        audioFileId: String,
        tagIds: [String]?,
        startSeconds: Double,
        endSeconds: Double,
        noteText: String?
    ) async throws {
        try await bookNotesRepository.createNote(
            bookId: bookId,
            audioFileId: audioFileId,
            tagIds: tagIds,
            startSeconds: startSeconds,
            endSeconds: endSeconds,
            noteText: noteText,
            entryType: nil,
            sourceText: nil
        )
    }
}
