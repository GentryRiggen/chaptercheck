import SwiftUI

/// Sheet for searching OpenLibrary and selecting a book to add.
struct AddBookView: View {
    @State private var viewModel = AddBookViewModel()
    @Environment(\.dismiss) private var dismiss

    /// Called when a book is confirmed and created, with the new book's ID.
    var onBookAdded: ((String) -> Void)?

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.results.isEmpty && !viewModel.isSearching {
                    if viewModel.query.trimmingCharacters(in: .whitespaces).count < 2 {
                        ContentUnavailableView(
                            "Search OpenLibrary",
                            systemImage: "magnifyingglass",
                            description: Text("Search for a book to add to your library.")
                        )
                    } else if let error = viewModel.error {
                        ContentUnavailableView(
                            "Search Error",
                            systemImage: "exclamationmark.triangle",
                            description: Text(error)
                        )
                    } else {
                        ContentUnavailableView.search(text: viewModel.query)
                    }
                } else {
                    resultsList
                }
            }
            .navigationTitle("Add Book")
            .navigationBarTitleDisplayMode(.inline)
            .searchable(text: $viewModel.query, placement: .navigationBarDrawer(displayMode: .always), prompt: "Search by title, author, or ISBN...")
            .onChange(of: viewModel.query) {
                viewModel.onQueryChanged()
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private var resultsList: some View {
        List {
            ForEach(viewModel.results) { suggestion in
                NavigationLink {
                    AddBookConfirmView(suggestion: suggestion) { bookId in
                        onBookAdded?(bookId)
                        dismiss()
                    }
                } label: {
                    suggestionRow(suggestion)
                }
            }

            if viewModel.isSearching {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.plain)
    }

    private func suggestionRow(_ suggestion: OpenLibraryBookSuggestion) -> some View {
        HStack(spacing: 12) {
            // Cover thumbnail
            if let coverUrl = suggestion.coverUrl {
                AsyncImage(url: URL(string: coverUrl)) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        coverPlaceholder
                    }
                }
                .frame(width: 48, height: 72)
                .clipShape(RoundedRectangle(cornerRadius: 4))
            } else {
                coverPlaceholder
            }

            VStack(alignment: .leading, spacing: 4) {
                Text(suggestion.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                if !suggestion.authorNames.isEmpty {
                    Text(suggestion.authorNames)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                if let year = suggestion.publishedYearInt {
                    Text(String(year))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding(.vertical, 4)
    }

    private var coverPlaceholder: some View {
        RoundedRectangle(cornerRadius: 4)
            .fill(.fill.tertiary)
            .frame(width: 48, height: 72)
            .overlay {
                Image(systemName: "book.closed")
                    .font(.title3)
                    .foregroundStyle(.quaternary)
            }
    }
}
