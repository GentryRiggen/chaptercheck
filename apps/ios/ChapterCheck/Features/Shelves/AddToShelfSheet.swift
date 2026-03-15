import Combine
import SwiftUI

/// Sheet for toggling a book's membership across all of the current user's shelves.
///
/// Shelves are listed with a checkmark when the book is already present.
/// Tapping a row immediately calls `addBookToShelf` or `removeBookFromShelf`.
/// A "Create New Shelf" button at the bottom opens `ShelfFormSheet`.
struct AddToShelfSheet: View {
    let bookId: String
    private let wantToReadShelfName = "Want to Read"

    @State private var shelves: [ShelfForBook] = []
    @State private var wantToReadStatus: WantToReadStatus?
    @State private var isLoading = true
    @State private var error: String?
    @State private var pendingBookIds = Set<String>()
    @State private var isWantToReadPending = false
    @State private var isCreateShelfPresented = false
    @State private var cancellables = Set<AnyCancellable>()
    @State private var didLoadShelves = false
    @State private var didLoadWantToRead = false

    @Environment(\.dismiss) private var dismiss

    private let repository = ShelfRepository()

    var body: some View {
        NavigationStack {
            Group {
                if isLoading {
                    LoadingView(message: "Loading shelves...")
                } else if let error, !hasAnyOptions {
                    ErrorView(message: error) {
                        subscribeToShelves()
                    }
                } else if !hasAnyOptions {
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
            get: { error != nil && hasAnyOptions },
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
        List {
            Section {
                wantToReadRow
            }

            if !displayShelves.isEmpty {
                Section("Shelves") {
                    ForEach(displayShelves) { shelf in
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
            }
        }
        .scrollContentBackground(.hidden)
    }

    private var wantToReadRow: some View {
        Button {
            toggleWantToRead()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: wantToReadStatus?.isOnWantToRead == true ? "bookmark.fill" : "bookmark")
                    .foregroundStyle(.tint)
                    .frame(width: 18)

                VStack(alignment: .leading, spacing: 2) {
                    Text("Want to Read")
                        .foregroundStyle(.primary)
                    Text("Save this book for later")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if isWantToReadPending {
                    ProgressView()
                        .controlSize(.small)
                } else if wantToReadStatus?.isOnWantToRead == true {
                    Image(systemName: "checkmark")
                        .foregroundStyle(.tint)
                        .fontWeight(.semibold)
                }
            }
        }
        .disabled(isWantToReadPending)
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
        didLoadShelves = false
        didLoadWantToRead = false

        repository.subscribeToMyShelvesForBook(bookId: bookId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let err) = completion {
                        error = err.localizedDescription
                        didLoadShelves = true
                        updateLoadingState()
                    }
                },
                receiveValue: { loadedShelves in
                    shelves = loadedShelves
                    didLoadShelves = true
                    updateLoadingState()
                }
            )
            .store(in: &cancellables)

        repository.subscribeToWantToReadStatus(bookId: bookId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure(let err) = completion {
                        error = err.localizedDescription
                        didLoadWantToRead = true
                        updateLoadingState()
                    }
                },
                receiveValue: { status in
                    wantToReadStatus = status
                    didLoadWantToRead = true
                    updateLoadingState()
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
                    ? "Couldn't remove from shelf. Please try again."
                    : "Couldn't add to shelf. Please try again."
            }
            pendingBookIds.remove(shelf._id)
        }
    }

    private func toggleWantToRead() {
        Haptics.selection()
        isWantToReadPending = true

        Task {
            do {
                let result = try await repository.toggleWantToRead(bookId: bookId)
                wantToReadStatus = WantToReadStatus(
                    isOnWantToRead: result.isOnWantToRead,
                    shelfId: result.shelfId
                )
            } catch {
                self.error = "Couldn't update Want to Read. Please try again."
            }
            isWantToReadPending = false
        }
    }

    private var displayShelves: [ShelfForBook] {
        shelves.filter {
            $0.name.trimmingCharacters(in: .whitespacesAndNewlines)
                .localizedCaseInsensitiveCompare(wantToReadShelfName) != .orderedSame
        }
    }

    private var hasAnyOptions: Bool {
        wantToReadStatus != nil || !displayShelves.isEmpty
    }

    private func updateLoadingState() {
        isLoading = !(didLoadShelves && didLoadWantToRead)
    }
}
