import Combine
import ConvexMobile
import Foundation

/// View model for the paginated "all reading history" screen.
///
/// Follows the same cursor-based pagination pattern as `LibraryViewModel`.
@Observable
@MainActor
final class AllReadingHistoryViewModel {

    // MARK: - Public State

    var books: [UserReadBook] = []
    var isLoading = true
    var isLoadingMore = false
    var hasMore = true
    var error: String?

    // MARK: - Private State

    private let repository = BookUserDataRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()
    private var currentCursor: String?
    private var currentUserId: String?

    // MARK: - Lifecycle

    func subscribe(userId: String) {
        currentUserId = userId
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty, let userId = currentUserId else { return }
                loadFirstPage(userId: userId)
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
    }

    func loadNextPage() {
        guard !isLoadingMore, hasMore, currentCursor != nil, let userId = currentUserId else { return }
        isLoadingMore = true
        subscribeToPage(userId: userId, cursor: currentCursor)
    }

    // MARK: - Private

    private func loadFirstPage(userId: String) {
        cancellables.removeAll()
        books = []
        currentCursor = nil
        hasMore = true
        isLoading = true
        error = nil
        subscribeToPage(userId: userId, cursor: nil)
    }

    private func subscribeToPage(userId: String, cursor: String?) {
        repository.subscribeToUserReadBooksPaginated(
            userId: userId,
            numItems: 20,
            cursor: cursor
        )?
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let err) = completion {
                    self?.error = err.localizedDescription
                    self?.isLoading = false
                    self?.isLoadingMore = false
                    self?.authObserver.needsResubscription()
                }
            },
            receiveValue: { [weak self] result in
                guard let self else { return }

                if cursor == nil {
                    self.books = result.page
                } else {
                    let existingIds = Set(self.books.map(\._id))
                    let newItems = result.page.filter { !existingIds.contains($0._id) }
                    self.books.append(contentsOf: newItems)
                }

                self.currentCursor = result.isDone ? nil : result.continueCursor
                self.hasMore = !result.isDone
                self.isLoading = false
                self.isLoadingMore = false
            }
        )
        .store(in: &cancellables)
    }
}
