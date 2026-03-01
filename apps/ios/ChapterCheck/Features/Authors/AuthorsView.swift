import SwiftUI

/// Authors browser with search and infinite scroll.
///
/// Displays authors in a 2-column grid. Supports two modes:
/// - **Browse**: Paginated with sort options (A-Z, Z-A, Recent).
/// - **Search**: Debounced full-text search when the search field is active.
struct AuthorsView: View {
    @State private var viewModel = AuthorsViewModel()

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.authors.isEmpty {
                LoadingView(message: "Loading authors...")
            } else if let error = viewModel.error, viewModel.authors.isEmpty {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe()
                }
            } else if viewModel.authors.isEmpty {
                EmptyStateView(
                    icon: "person.2",
                    title: "No Authors Found",
                    subtitle: viewModel.searchText.isEmpty
                        ? "No authors in your library yet."
                        : "No authors match your search."
                )
            } else {
                authorGrid
            }
        }
        .navigationTitle("Authors")
        .searchable(
            text: $viewModel.searchText,
            prompt: "Search authors..."
        )
        .onChange(of: viewModel.searchText) {
            viewModel.onSearchTextChanged()
        }
        .onChange(of: viewModel.sortOption) {
            viewModel.onSortChanged()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                authorSortMenu
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

    private var authorGrid: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(viewModel.authors) { author in
                    NavigationLink(value: AppDestination.author(id: author._id)) {
                        AuthorGridCard(author: author)
                    }
                    .buttonStyle(.plain)
                    .onAppear {
                        // Trigger infinite scroll when the last item appears
                        if author._id == viewModel.authors.last?._id {
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

    // MARK: - Sort Menu

    private var authorSortMenu: some View {
        Menu {
            ForEach(AuthorsViewModel.AuthorSortOption.allCases) { option in
                Button {
                    viewModel.sortOption = option
                } label: {
                    Label(option.displayName, systemImage: option.icon)
                }
            }
        } label: {
            Label("Sort", systemImage: "arrow.up.arrow.down")
                .labelStyle(.iconOnly)
        }
    }
}

#Preview {
    NavigationStack {
        AuthorsView()
    }
}
