import Combine
import ConvexMobile
import SwiftUI

struct BookPickerSheet: View {
    let onSelect: (BookWithDetails) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @State private var recentBooks: [BookWithDetails] = []
    @State private var searchResults: [BookWithDetails] = []
    @State private var isLoading = true
    @State private var loadError: String?
    @State private var cancellables = Set<AnyCancellable>()

    private let bookRepository = BookRepository()

    var body: some View {
        NavigationStack {
            Group {
                if let loadError {
                    ContentUnavailableView(
                        "Unable to Load Books",
                        systemImage: "exclamationmark.triangle",
                        description: Text(loadError)
                    )
                } else if isLoading && recentBooks.isEmpty && searchResults.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(displayedBooks) { book in
                        Button {
                            onSelect(book)
                            dismiss()
                        } label: {
                            HStack(spacing: 12) {
                                BookCoverView(r2Key: book.coverImageR2Key, displayMode: .square(40))
                                    .clipShape(RoundedRectangle(cornerRadius: 6))

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(book.title)
                                        .font(.subheadline.weight(.medium))
                                        .lineLimit(1)
                                    if let author = book.authors.first {
                                        Text(author.name)
                                            .font(.caption)
                                            .foregroundStyle(.secondary)
                                    }
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                    .listStyle(.plain)
                }
            }
            .navigationTitle("Choose a Book")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $searchText, prompt: "Search books...")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .onAppear { subscribeToRecentBooks() }
        .onChange(of: searchText) { _, newValue in
            if newValue.isEmpty {
                searchResults = []
            } else {
                subscribeToSearch(query: newValue)
            }
        }
        .onDisappear { cancellables.removeAll() }
    }

    private var displayedBooks: [BookWithDetails] {
        searchText.isEmpty ? recentBooks : searchResults
    }

    private func subscribeToRecentBooks() {
        bookRepository.subscribeToRecentBooks(limit: 20)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [self] completion in
                    if case .failure(let error) = completion {
                        loadError = error.localizedDescription
                        isLoading = false
                    }
                },
                receiveValue: { [self] books in
                    recentBooks = books
                    isLoading = false
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToSearch(query: String) {
        bookRepository.subscribeToBookSearch(query: query)?
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { [self] books in
                    searchResults = books
                }
            )
            .store(in: &cancellables)
    }
}
