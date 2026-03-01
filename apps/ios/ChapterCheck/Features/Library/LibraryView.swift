import SwiftUI

/// Book library browser with search, genre filtering, and infinite scroll.
///
/// Displays books in a 2-column grid. Supports three modes:
/// - **Browse**: Paginated with sort options (A-Z, Z-A, Recent, Top Rated).
/// - **Search**: Debounced full-text search when the search field is active.
/// - **Genre filter**: Non-paginated results for the selected genres (up to 50).
///
/// Mode priority: search > genre filter > browse.
struct LibraryView: View {
    @State private var viewModel = LibraryViewModel()
    @State private var isGenreFilterPresented = false

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
                    subtitle: emptyStateSubtitle
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
        .onChange(of: viewModel.selectedGenreIds) {
            viewModel.onGenreFilterChanged()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                HStack(spacing: 4) {
                    Button {
                        isGenreFilterPresented = true
                    } label: {
                        Image(systemName: viewModel.isGenreFilterActive
                            ? "line.3.horizontal.decrease.circle.fill"
                            : "line.3.horizontal.decrease.circle"
                        )
                        .symbolRenderingMode(.hierarchical)
                    }
                    .accessibilityLabel(
                        viewModel.isGenreFilterActive
                            ? "Genre filter active (\(viewModel.selectedGenreIds.count) selected)"
                            : "Filter by genre"
                    )

                    SortPicker(selection: $viewModel.sortOption)
                }
            }
        }
        .sheet(isPresented: $isGenreFilterPresented) {
            GenreFilterSheet(selectedGenreIds: $viewModel.selectedGenreIds)
        }
        .onAppear {
            viewModel.subscribe()
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    private var emptyStateSubtitle: String {
        if !viewModel.searchText.isEmpty {
            return "No books match your search."
        } else if viewModel.isGenreFilterActive {
            return "No books found for the selected genres."
        } else {
            return "Your library is empty."
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
