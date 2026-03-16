import Combine
import ConvexMobile
import Foundation

// MARK: - CurrentUserProvider

/// Maintains a single Convex subscription to the current authenticated user,
/// shared across all views via `@Environment(CurrentUserProvider.self)`.
///
/// Eliminates duplicate `users/queries:getCurrentUserWithPermissions` WebSocket
/// subscriptions that were previously created independently in 10+ ViewModels.
@Observable
@MainActor
final class CurrentUserProvider {

    // MARK: - Public State

    private(set) var currentUser: UserWithPermissions?

    // MARK: - Private

    private let userRepository = UserRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Lifecycle

    func subscribe() {
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                subscribeToCurrentUser()
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
                self?.currentUser = nil
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
        currentUser = nil
    }

    // MARK: - Private Subscription

    private func subscribeToCurrentUser() {
        guard let publisher = userRepository.subscribeToCurrentUser() else { return }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure = completion {
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] user in
                    self?.currentUser = user
                }
            )
            .store(in: &cancellables)
    }
}

// MARK: - GenreProvider

/// Maintains a single Convex subscription to all genres,
/// shared across all views via `@Environment(GenreProvider.self)`.
///
/// Eliminates duplicate `genres/queries:getAllGenres` WebSocket subscriptions
/// that were previously created independently in BookDetailViewModel,
/// NowPlayingDetailsViewModel, and GenreFilterSheet.
@Observable
@MainActor
final class GenreProvider {

    // MARK: - Public State

    private(set) var allGenres: [Genre] = []

    // MARK: - Private

    private let genreRepository = GenreRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Lifecycle

    func subscribe() {
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                subscribeToAllGenres()
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
                self?.allGenres = []
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
        allGenres = []
    }

    // MARK: - Private Subscription

    private func subscribeToAllGenres() {
        guard let publisher = genreRepository.subscribeToAllGenres() else { return }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure = completion {
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] genres in
                    self?.allGenres = genres
                }
            )
            .store(in: &cancellables)
    }
}

// MARK: - TagProvider

/// Maintains a single Convex subscription to the current user's memory tags,
/// shared across all views via `@Environment(TagProvider.self)`.
///
/// Eliminates duplicate `bookNotes/queries:getMyMemoryTags` WebSocket subscriptions
/// that were previously created independently in BookDetailViewModel,
/// NowPlayingDetailsViewModel, and NotesTabViewModel.
@Observable
@MainActor
final class TagProvider {

    // MARK: - Public State

    private(set) var tags: [MemoryTag] = []

    // MARK: - Private

    private let bookNotesRepository = BookNotesRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()

    // MARK: - Lifecycle

    func subscribe() {
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                subscribeToMyTags()
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
                self?.tags = []
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
        tags = []
    }

    // MARK: - Private Subscription

    private func subscribeToMyTags() {
        guard let publisher = bookNotesRepository.subscribeToMyTags() else { return }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure = completion {
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] tags in
                    self?.tags = tags
                }
            )
            .store(in: &cancellables)
    }
}
