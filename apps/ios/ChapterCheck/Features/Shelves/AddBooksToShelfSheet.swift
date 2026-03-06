import Combine
import SwiftUI

/// Sheet for searching and adding multiple books to a shelf.
///
/// Presents a search bar with real-time results. Books already on the shelf
/// are shown with a checkmark and cannot be re-added. Selected books are
/// added in batch when the user taps "Add".
struct AddBooksToShelfSheet: View {
    let shelfId: String
    let existingBookIds: Set<String>

    @State private var searchText = ""
    @State private var searchResults: [BookWithDetails] = []
    @State private var selectedBookIds = Set<String>()
    @State private var isSearching = false
    @State private var isAdding = false
    @State private var error: String?
    @State private var cancellables = Set<AnyCancellable>()
    @State private var searchDebounceTask: Task<Void, Never>?

    @Environment(\.dismiss) private var dismiss

    private let bookRepository = BookRepository()
    private let shelfRepository = ShelfRepository()

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                searchBar

                Group {
                    if searchText.trimmingCharacters(in: .whitespaces).isEmpty {
                        promptView
                    } else if isSearching && searchResults.isEmpty {
                        LoadingView(message: "Searching...")
                    } else if searchResults.isEmpty {
                        emptyResultsView
                    } else {
                        resultsList
                    }
                }
                .frame(maxHeight: .infinity)
            }
            .navigationTitle("Add Books")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    if isAdding {
                        ProgressView()
                    } else {
                        Button("Add \(selectedBookIds.count)") {
                            Task { await addSelectedBooks() }
                        }
                        .fontWeight(.semibold)
                        .disabled(selectedBookIds.isEmpty)
                    }
                }
            }
            .alert("Error", isPresented: .init(
                get: { error != nil },
                set: { if !$0 { error = nil } }
            )) {
                Button("OK", role: .cancel) { error = nil }
            } message: {
                Text(error ?? "")
            }
        }
        .presentationDetents([.large])
        .onDisappear {
            cancellables.removeAll()
            searchDebounceTask?.cancel()
        }
    }

    // MARK: - Search Bar

    private var searchBar: some View {
        HStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(.secondary)

            TextField("Search books by title...", text: $searchText)
                .textFieldStyle(.plain)
                .autocorrectionDisabled()

            if !searchText.isEmpty {
                Button {
                    searchText = ""
                    searchResults = []
                    cancellables.removeAll()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(10)
        .background(.fill.quaternary)
        .clipShape(RoundedRectangle(cornerRadius: 10))
        .padding(.horizontal)
        .padding(.vertical, 8)
        .onChange(of: searchText) { _, newValue in
            debounceSearch(newValue)
        }
    }

    // MARK: - Content Views

    private var promptView: some View {
        VStack(spacing: 8) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
            Text("Search for books to add")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var emptyResultsView: some View {
        VStack(spacing: 8) {
            Image(systemName: "book.closed")
                .font(.system(size: 32))
                .foregroundStyle(.secondary)
            Text("No books found")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var resultsList: some View {
        List(searchResults) { book in
            let alreadyOnShelf = existingBookIds.contains(book._id)
            let isSelected = selectedBookIds.contains(book._id)

            Button {
                guard !alreadyOnShelf else { return }
                Haptics.selection()
                if isSelected {
                    selectedBookIds.remove(book._id)
                } else {
                    selectedBookIds.insert(book._id)
                }
            } label: {
                HStack(spacing: 12) {
                    BookCoverView(r2Key: book.coverImageR2Key, size: 50)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(book.title)
                            .font(.subheadline)
                            .fontWeight(.medium)
                            .lineLimit(2)
                            .foregroundStyle(alreadyOnShelf ? .secondary : .primary)

                        if let author = book.authors.first?.name {
                            Text(author)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .lineLimit(1)
                        }
                    }

                    Spacer(minLength: 0)

                    if alreadyOnShelf {
                        Text("Added")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    } else if isSelected {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.tint)
                            .font(.title3)
                    } else {
                        Image(systemName: "circle")
                            .foregroundStyle(.secondary)
                            .font(.title3)
                    }
                }
                .padding(.vertical, 4)
            }
            .disabled(alreadyOnShelf)
        }
        .listStyle(.plain)
    }

    // MARK: - Search

    private func debounceSearch(_ query: String) {
        searchDebounceTask?.cancel()
        cancellables.removeAll()

        let trimmed = query.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else {
            searchResults = []
            isSearching = false
            return
        }

        isSearching = true

        searchDebounceTask = Task {
            try? await Task.sleep(for: .milliseconds(300))
            guard !Task.isCancelled else { return }

            guard let publisher = bookRepository.subscribeToBookSearch(query: trimmed) else { return }
            publisher
                .receive(on: DispatchQueue.main)
                .sink(
                    receiveCompletion: { completion in
                        if case .failure(let err) = completion {
                            error = err.localizedDescription
                            isSearching = false
                        }
                    },
                    receiveValue: { books in
                        searchResults = books
                        isSearching = false
                    }
                )
                .store(in: &cancellables)
        }
    }

    // MARK: - Add Books

    private func addSelectedBooks() async {
        isAdding = true
        let bookIds = Array(selectedBookIds)

        var failedCount = 0
        await withTaskGroup(of: Bool.self) { group in
            for bookId in bookIds {
                group.addTask {
                    do {
                        try await shelfRepository.addBookToShelf(shelfId: shelfId, bookId: bookId)
                        return true
                    } catch {
                        return false
                    }
                }
            }
            for await success in group where !success {
                failedCount += 1
            }
        }

        if failedCount == 0 {
            Haptics.medium()
            dismiss()
        } else {
            let addedCount = bookIds.count - failedCount
            self.error = addedCount > 0
                ? "Added \(addedCount) books, but \(failedCount) failed. Try again for the rest."
                : "Failed to add books. Please try again."
            isAdding = false
        }
    }
}
