import Combine
import ConvexMobile
import Foundation

/// View model for the paginated "all books" screen with status filtering.
///
/// Supports filtering by any `ReadingStatus` or showing all books. When the
/// selected status changes, the subscription is reset and a fresh page is loaded.
@Observable
@MainActor
final class AllReadingHistoryViewModel {

    // MARK: - Public State

    var books: [UserBookWithStatus] = []
    var isLoading = true
    var isLoadingMore = false
    var hasMore = true
    var error: String?
    var selectedStatus: ReadingStatus?

    // MARK: - Private State

    private let repository = BookUserDataRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()
    private var currentCursor: String?
    private var currentUserId: String?

    // MARK: - Lifecycle

    func subscribe(userId: String, initialStatus: ReadingStatus? = nil) {
        currentUserId = userId
        if selectedStatus == nil && initialStatus != nil {
            selectedStatus = initialStatus
        }
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

    func refresh() async {
        guard let userId = currentUserId else { return }
        unsubscribe()
        isLoading = true
        error = nil
        subscribe(userId: userId)
        while isLoading && !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    func selectStatus(_ status: ReadingStatus?) {
        guard status != selectedStatus else { return }
        selectedStatus = status
        guard let userId = currentUserId else { return }
        cancellables.removeAll()
        loadFirstPage(userId: userId)
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
        repository.subscribeToUserBooksByStatusPaginated(
            userId: userId,
            status: selectedStatus?.rawValue,
            numItems: 20,
            cursor: cursor
        )?
        .receive(on: DispatchQueue.main)
        .sink(
            receiveCompletion: { [weak self] completion in
                if case .failure(let err) = completion {
                    self?.error = userFacingMessage(from: err, fallback: "Unable to load books")
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
