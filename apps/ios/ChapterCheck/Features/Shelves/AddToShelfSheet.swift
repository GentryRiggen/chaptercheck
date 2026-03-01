import Combine
import SwiftUI

/// Sheet for toggling a book's membership across all of the current user's shelves.
///
/// Shelves are listed with a checkmark when the book is already present.
/// Tapping a row immediately calls `addBookToShelf` or `removeBookFromShelf`.
/// A "Create New Shelf" button at the bottom opens `ShelfFormSheet`.
struct AddToShelfSheet: View {
    let bookId: String

    @State private var shelves: [ShelfForBook] = []
    @State private var isLoading = true
    @State private var error: String?
    @State private var pendingBookIds = Set<String>()
    @State private var isCreateShelfPresented = false
    @State private var cancellables = Set<AnyCancellable>()

    @Environment(\.dismiss) private var dismiss

    private let repository = ShelfRepository()

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    LoadingView(message: "Loading shelves...")
                } else if let error, shelves.isEmpty {
                    ErrorView(message: error) {
                        subscribeToShelves()
                    }
                } else if shelves.isEmpty {
                    EmptyStateView(
                        icon: "books.vertical",
                        title: "No Shelves",
                        subtitle: "Create a shelf to start organizing your books."
                    )
                } else {
                    shelfList
                }
            }
            .navigationTitle("Add to Shelf")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .safeAreaInset(edge: .bottom) {
                createShelfButton
            }
        }
        .presentationDetents([.medium, .large])
        .alert("Error", isPresented: .init(
            get: { error != nil && !shelves.isEmpty },
            set: { if !$0 { error = nil } }
        )) {
            Button("OK", role: .cancel) { error = nil }
        } message: {
            Text(error ?? "")
        }
        .sheet(isPresented: $isCreateShelfPresented) {
            ShelfFormSheet()
        }
        .onAppear {
            subscribeToShelves()
        }
        .onDisappear {
            cancellables.removeAll()
        }
    }

    // MARK: - Shelf List

    private var shelfList: some View {
        List(shelves) { shelf in
            Button {
                toggleShelf(shelf)
            } label: {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(shelf.name)
                            .foregroundStyle(.primary)

                        HStack(spacing: 4) {
                            if shelf.isOrdered {
                                Image(systemName: "list.number")
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    Spacer()

                    if pendingBookIds.contains(shelf._id) {
                        ProgressView()
                            .controlSize(.small)
                    } else if shelf.containsBook {
                        Image(systemName: "checkmark")
                            .foregroundStyle(.tint)
                            .fontWeight(.semibold)
                    }
                }
            }
            .disabled(pendingBookIds.contains(shelf._id))
        }
    }

    // MARK: - Create Shelf Button

    private var createShelfButton: some View {
        Button {
            isCreateShelfPresented = true
        } label: {
            Label("Create New Shelf", systemImage: "plus")
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
        }
        .buttonStyle(.borderedProminent)
        .padding(.horizontal)
        .padding(.bottom, 8)
        .background(.regularMaterial)
    }

    // MARK: - Subscription

    private func subscribeToShelves() {
        cancellables.removeAll()
        isLoading = true
        error = nil

        repository.subscribeToMyShelvesForBook(bookId: bookId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let err) = completion {
                        error = err.localizedDescription
                        isLoading = false
                    }
                },
                receiveValue: { loadedShelves in
                    shelves = loadedShelves
                    isLoading = false
                }
            )
            .store(in: &cancellables)
    }

    // MARK: - Toggle

    private func toggleShelf(_ shelf: ShelfForBook) {
        Haptics.selection()
        pendingBookIds.insert(shelf._id)

        Task {
            do {
                if shelf.containsBook {
                    try await repository.removeBookFromShelf(shelfId: shelf._id, bookId: bookId)
                } else {
                    try await repository.addBookToShelf(shelfId: shelf._id, bookId: bookId)
                }
            } catch {
                self.error = shelf.containsBook
                    ? "Failed to remove from shelf"
                    : "Failed to add to shelf"
            }
            pendingBookIds.remove(shelf._id)
        }
    }
}
