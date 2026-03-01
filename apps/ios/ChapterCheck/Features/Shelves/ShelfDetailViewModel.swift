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

    // MARK: - Dependencies

    private let repository = ShelfRepository()
    private var cancellables = Set<AnyCancellable>()
    private var currentShelfId: String?

    // MARK: - Lifecycle

    func subscribe(shelfId: String) {
        guard cancellables.isEmpty else { return }
        currentShelfId = shelfId

        repository.subscribeToShelf(shelfId: shelfId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let err) = completion {
                        self?.error = err.localizedDescription
                        self?.isLoading = false
                    }
                },
                receiveValue: { [weak self] shelf in
                    self?.shelf = shelf
                    self?.isLoading = false
                }
            )
            .store(in: &cancellables)
    }

    func unsubscribe() {
        cancellables.removeAll()
        currentShelfId = nil
    }

    // MARK: - Mutations

    /// Delete the current shelf. Errors are surfaced via `error`.
    func deleteShelf() async {
        guard let shelfId = currentShelfId else { return }
        do {
            Haptics.medium()
            try await repository.deleteShelf(shelfId: shelfId)
        } catch {
            self.error = error.localizedDescription
        }
    }

    /// Remove a book from the current shelf.
    func removeBook(bookId: String) async {
        guard let shelfId = currentShelfId else { return }
        do {
            try await repository.removeBookFromShelf(shelfId: shelfId, bookId: bookId)
        } catch {
            self.error = error.localizedDescription
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
                self.error = error.localizedDescription
            }
        }
    }
}
