import SwiftUI

/// Authors browser with search and infinite scroll.
///
/// Displays authors in a 2-column grid. Supports two modes:
/// - **Browse**: Paginated with sort options (A-Z, Z-A, Recent).
/// - **Search**: Debounced full-text search when the search field is active.
struct AuthorsView: View {
    @State private var viewModel = AuthorsViewModel()
    @Environment(DownloadManager.self) private var downloadManager
    private let networkMonitor = NetworkMonitor.shared

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
            placement: .navigationBarDrawer(displayMode: .always),
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
            viewModel.downloadManager = downloadManager
            viewModel.subscribe()
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
        .onChange(of: networkMonitor.isConnected) { _, isConnected in
            if isConnected {
                viewModel.recoverFromOffline()
            }
        }
    }

    // MARK: - Grid

    private var authorGrid: some View {
        ScrollView {
            if viewModel.isOffline {
                OfflineBanner()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.top, 8)
            }

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
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(0..<4, id: \.self) { _ in
                        AuthorGridCardSkeleton()
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }

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
                    if option == viewModel.sortOption {
                        Label(option.displayName, systemImage: "checkmark")
                    } else {
                        Label(option.displayName, systemImage: option.icon)
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "arrow.up.arrow.down")
                Text(viewModel.sortOption.displayName)
                    .font(.subheadline)
            }
        }
    }
}

// MARK: - Skeleton

/// Placeholder card matching `AuthorGridCard` layout, shown while loading the next page.
private struct AuthorGridCardSkeleton: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .center, spacing: 8) {
            // Circular image placeholder
            Circle()
                .fill(.fill.tertiary)
                .frame(width: 80, height: 80)

            // Name placeholder
            RoundedRectangle(cornerRadius: 4)
                .fill(.fill.tertiary)
                .frame(width: 90, height: 14)

            // Subtitle placeholder
            RoundedRectangle(cornerRadius: 4)
                .fill(.fill.tertiary)
                .frame(width: 60, height: 12)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .opacity(isAnimating ? 0.4 : 1.0)
        .animation(
            .easeInOut(duration: 1.0).repeatForever(autoreverses: true),
            value: isAnimating
        )
        .onAppear { isAnimating = true }
    }
}

#Preview {
    NavigationStack {
        AuthorsView()
    }
}
