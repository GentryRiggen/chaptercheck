import Combine
import ConvexMobile
import Foundation

/// View model for the user profile screen.
///
/// Subscribes to four parallel data sources: the user's profile, their shelves,
/// their reading history, and their reviews. Loading is dismissed once all four
/// have emitted at least one value. The `markLoaded` pattern prevents the loading
/// state from flickering as each subscription arrives independently.
@Observable
@MainActor
final class ProfileViewModel {

    // MARK: - Public State

    var profile: UserProfile?
    var shelves: [Shelf] = []
    var isShelvesOwner = false
    var readBooks: [UserReadBook] = []
    var reviews: [UserReview] = []
    var isLoading = true
    var error: String?

    // MARK: - Private State

    private let userRepository = UserRepository()
    private let shelfRepository = ShelfRepository()
    private let bookUserDataRepository = BookUserDataRepository()
    private var cancellables = Set<AnyCancellable>()

    /// Tracks which data sections have received their first value.
    private var loadedSections: Set<String> = []

    // MARK: - Lifecycle

    func subscribe(userId: String) {
        guard cancellables.isEmpty else { return }
        subscribeToProfile(userId: userId)
        subscribeToShelves(userId: userId)
        subscribeToReadBooks(userId: userId)
        subscribeToReviews(userId: userId)
    }

    func unsubscribe() {
        cancellables.removeAll()
        loadedSections.removeAll()
    }

    // MARK: - Private Subscriptions

    private func subscribeToProfile(userId: String) {
        guard let publisher = userRepository.subscribeToUserProfile(userId: userId) else {
            markLoaded(section: "profile")
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let err) = completion {
                        self?.error = err.localizedDescription
                        self?.markLoaded(section: "profile")
                    }
                },
                receiveValue: { [weak self] profile in
                    self?.profile = profile
                    self?.markLoaded(section: "profile")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToShelves(userId: String) {
        shelfRepository.subscribeToUserShelves(userId: userId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let err) = completion {
                        self?.error = err.localizedDescription
                        self?.markLoaded(section: "shelves")
                    }
                },
                receiveValue: { [weak self] response in
                    self?.shelves = response.shelves
                    self?.isShelvesOwner = response.isOwner
                    self?.markLoaded(section: "shelves")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToReadBooks(userId: String) {
        guard let publisher = bookUserDataRepository.subscribeToUserReadBooks(userId: userId) else {
            markLoaded(section: "readBooks")
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let err) = completion {
                        self?.error = err.localizedDescription
                        self?.markLoaded(section: "readBooks")
                    }
                },
                receiveValue: { [weak self] books in
                    self?.readBooks = books
                    self?.markLoaded(section: "readBooks")
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToReviews(userId: String) {
        guard let publisher = bookUserDataRepository.subscribeToUserReviews(userId: userId) else {
            markLoaded(section: "reviews")
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let err) = completion {
                        self?.error = err.localizedDescription
                        self?.markLoaded(section: "reviews")
                    }
                },
                receiveValue: { [weak self] reviews in
                    self?.reviews = reviews
                    self?.markLoaded(section: "reviews")
                }
            )
            .store(in: &cancellables)
    }

    // MARK: - Loading State

    /// Marks a section as having loaded and dismisses the global loading state
    /// once all four sections have received their first value.
    private func markLoaded(section: String) {
        loadedSections.insert(section)
        if loadedSections.count >= 4 {
            isLoading = false
        }
    }
}
