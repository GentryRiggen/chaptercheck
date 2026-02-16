import SwiftUI

/// Book library browser with search and infinite scroll.
///
/// Displays books in a 2-column grid. Supports two modes:
/// - **Browse**: Paginated with sort options (A-Z, Z-A, Recent, Top Rated).
/// - **Search**: Debounced full-text search when the search field is active.
struct LibraryView: View {
    @State private var viewModel = LibraryViewModel()

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.books.isEmpty {
                LoadingView(message: "Loading library...")
            } else if let error = viewModel.error, viewModel.books.isEmpty {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe()
                }
            } else if viewModel.books.isEmpty {
                EmptyStateView(
                    icon: "books.vertical",
                    title: "No Books Found",
                    subtitle: viewModel.searchText.isEmpty
                        ? "Your library is empty."
                        : "No books match your search."
                )
            } else {
                bookGrid
            }
        }
        .navigationTitle("Library")
        .searchable(
            text: $viewModel.searchText,
            prompt: "Search books..."
        )
        .onChange(of: viewModel.searchText) {
            viewModel.onSearchTextChanged()
        }
        .onChange(of: viewModel.sortOption) {
            viewModel.onSortChanged()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                SortPicker(selection: $viewModel.sortOption)
            }
        }
        .onAppear {
            viewModel.subscribe()
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    // MARK: - Grid

    private var bookGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(viewModel.books) { book in
                    NavigationLink(value: AppDestination.book(id: book._id)) {
                        BookGridCard(book: book)
                    }
                    .buttonStyle(.plain)
                    .onAppear {
                        // Trigger infinite scroll when the last item appears
                        if book._id == viewModel.books.last?._id {
                            viewModel.loadNextPage()
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)

            if viewModel.isLoadingMore {
                ProgressView()
                    .padding(.vertical, 16)
            }

            // Bottom spacing for mini player
            Spacer()
                .frame(height: 80)
        }
    }
}

#Preview {
    NavigationStack {
        LibraryView()
    }
}
