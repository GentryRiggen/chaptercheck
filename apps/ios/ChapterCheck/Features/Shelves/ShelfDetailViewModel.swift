import Combine
import ConvexMobile
import Foundation

/// View model for the shelf detail screen.
///
/// Subscribes to a single shelf and exposes mutation methods for the view.
/// Optimistic reordering updates local state immediately before the network
/// round-trip so the list never appears to jump.
@Observable
@MainActor
final class ShelfDetailViewModel {

    // MARK: - Public State

    var shelf: ShelfDetail?
    var isLoading = true
    var error: String?

    /// Callback for showing transient toast messages on mutation errors.
    var showToast: ((ToastMessage) -> Void)?

    // MARK: - Dependencies

    private let repository = ShelfRepository()
    private let authObserver = ConvexAuthObserver()
    private var cancellables = Set<AnyCancellable>()
    private var currentShelfId: String?

    // MARK: - Lifecycle

    func subscribe(shelfId: String) {
        currentShelfId = shelfId
        authObserver.start(
            onAuthenticated: { [weak self] in
                guard let self, cancellables.isEmpty, let shelfId = currentShelfId else { return }
                self.setupSubscription(shelfId: shelfId)
            },
            onUnauthenticated: { [weak self] in
                self?.cancellables.removeAll()
            }
        )
    }

    func unsubscribe() {
        authObserver.cancel()
        cancellables.removeAll()
        currentShelfId = nil
    }

    func refresh() async {
        guard let shelfId = currentShelfId else { return }
        unsubscribe()
        isLoading = true
        error = nil
        subscribe(shelfId: shelfId)
        while isLoading && !Task.isCancelled {
            try? await Task.sleep(for: .milliseconds(50))
        }
    }

    private func setupSubscription(shelfId: String) {
        repository.subscribeToShelf(shelfId: shelfId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let err) = completion {
                        self?.error = userFacingMessage(from: err, fallback: "Unable to load this shelf")
                        self?.isLoading = false
                        self?.authObserver.needsResubscription()
                    }
                },
                receiveValue: { [weak self] shelf in
                    self?.shelf = shelf
                    self?.isLoading = false
                }
            )
            .store(in: &cancellables)
    }

    // MARK: - Mutations

    /// Delete the current shelf. Errors are surfaced via `error`.
    func deleteShelf() async {
        guard let shelfId = currentShelfId else { return }
        do {
            Haptics.medium()
            try await repository.deleteShelf(shelfId: shelfId)
        } catch {
            self.error = userFacingMessage(from: error, fallback: "Unable to delete shelf")
        }
    }

    /// Remove a book from the current shelf.
    func removeBook(bookId: String) async {
        guard let shelfId = currentShelfId else { return }
        do {
            try await repository.removeBookFromShelf(shelfId: shelfId, bookId: bookId)
        } catch {
            showToast?(ToastMessage(message: "Failed to remove book from shelf", style: .error))
        }
    }

    /// Optimistically reorder books, then persist the new order to the backend.
    ///
    /// Local state updates immediately for instant UI feedback. If the mutation
    /// fails, `error` is set and the subscription's next emission will restore
    /// the server-authoritative order.
    func reorderBooks(from source: IndexSet, to destination: Int) {
        guard var books = shelf?.books else { return }
        books.move(fromOffsets: source, toOffset: destination)

        // Apply the optimistic update to the in-memory shelf copy.
        if let current = shelf {
            shelf = ShelfDetail(
                _id: current._id,
                userId: current.userId,
                name: current.name,
                description: current.description,
                isOrdered: current.isOrdered,
                isPublic: current.isPublic,
                createdAt: current.createdAt,
                updatedAt: current.updatedAt,
                isOwner: current.isOwner,
                owner: current.owner,
                books: books
            )
        }

        let bookIds = books.map { $0._id }
        guard let shelfId = currentShelfId else { return }

        Task {
            do {
                try await repository.reorderShelfBooks(shelfId: shelfId, bookIds: bookIds)
            } catch {
                showToast?(ToastMessage(message: "Failed to save new order", style: .error))
            }
        }
    }
}
