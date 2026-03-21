import Combine
import ConvexMobile
import Foundation

@Observable
@MainActor
final class UserSearchViewModel {

    // MARK: - State

    var searchText = ""
    var searchResults: [FollowedUser] = []
    var following: [FollowedUser] = []
    var isSearching = false
    var isLoadingFollowing = true
    var error: String?

    // MARK: - Computed

    var isSearchActive: Bool {
        !searchText.trimmingCharacters(in: .whitespaces).isEmpty
    }

    // MARK: - Dependencies

    private let userRepository = UserRepository()
    private let socialRepository = SocialRepository()
    private let authObserver = ConvexAuthObserver()
    private let logger = AppLogger(category: "UserSearchViewModel")
    private var cancellables = Set<AnyCancellable>()
    private var searchCancellable: AnyCancellable?
    private var searchDebounceTask: Task<Void, Never>?
    private static let searchDebounceDelay: Duration = .milliseconds(300)

    // MARK: - Lifecycle

    func subscribe() {
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty else { return }
                logger.info("Auth ready — subscribing to following list")
                subscribeToMyFollowing()
            },
            onUnauthenticated: { [weak self] in
                guard let self else { return }
                tearDown()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        tearDown()
    }

    private func tearDown() {
        cancellables.removeAll()
        searchCancellable?.cancel()
        searchCancellable = nil
        searchDebounceTask?.cancel()
    }

    // MARK: - Following Subscription

    private func subscribeToMyFollowing() {
        guard let publisher = socialRepository.subscribeToMyFollowing() else {
            isLoadingFollowing = false
            return
        }
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("Following subscription failed: \(error)")
                    }
                    self?.isLoadingFollowing = false
                },
                receiveValue: { [weak self] users in
                    self?.following = users
                    self?.isLoadingFollowing = false
                }
            )
            .store(in: &cancellables)
    }

    // MARK: - Search

    func onSearchTextChanged() {
        searchDebounceTask?.cancel()

        let query = searchText.trimmingCharacters(in: .whitespaces)

        if query.isEmpty {
            searchCancellable?.cancel()
            searchCancellable = nil
            searchResults = []
            isSearching = false
            return
        }

        isSearching = true

        searchDebounceTask = Task {
            try? await Task.sleep(for: Self.searchDebounceDelay)
            guard !Task.isCancelled else { return }
            performSearch(query: query)
        }
    }

    private func performSearch(query: String) {
        searchCancellable?.cancel()

        guard let publisher = userRepository.subscribeToUserSearch(query: query) else {
            isSearching = false
            return
        }

        searchCancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.logger.error("User search failed: \(error)")
                    }
                    self?.isSearching = false
                },
                receiveValue: { [weak self] users in
                    self?.searchResults = users
                    self?.isSearching = false
                }
            )
    }
}
