import Combine
import ConvexMobile
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
    var initialSort: SortOption = .titleAsc

    @State private var viewModel = LibraryViewModel()
    @State private var isGenreFilterPresented = false
    @State private var isAddBookPresented = false
    @State private var currentUser: UserWithPermissions?
    @State private var userCancellable: AnyCancellable?
    @Environment(DownloadManager.self) private var downloadManager
    private let networkMonitor = NetworkMonitor.shared
    private let userRepository = UserRepository()

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
        .navigationTitle("Books")
        .searchable(
            text: $viewModel.searchText,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: viewModel.isOffline ? "Search unavailable offline" : "Search books..."
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
                    if currentUser?.permissions.canCreateContent == true {
                        Button {
                            isAddBookPresented = true
                        } label: {
                            Image(systemName: "plus")
                        }
                        .accessibilityLabel("Add book")
                    }

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
        .sheet(isPresented: $isAddBookPresented) {
            AddBookView { bookId in
                isAddBookPresented = false
            }
        }
        .onAppear {
            viewModel.downloadManager = downloadManager
            viewModel.sortOption = initialSort
            viewModel.subscribe()
            subscribeToUser()
        }
        .onDisappear {
            viewModel.unsubscribe()
            userCancellable?.cancel()
            userCancellable = nil
        }
        .onChange(of: networkMonitor.isConnected) { _, isConnected in
            if isConnected {
                viewModel.recoverFromOffline()
            }
        }
    }

    private func subscribeToUser() {
        guard userCancellable == nil,
              let publisher = userRepository.subscribeToCurrentUser() else { return }
        userCancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { user in currentUser = user }
            )
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
            if viewModel.isOffline {
                OfflineBanner()
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)
                    .padding(.top, 8)
            }

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
                LazyVGrid(columns: columns, spacing: 16) {
                    ForEach(0..<4, id: \.self) { _ in
                        BookGridCardSkeleton()
                    }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }

            Spacer()
                .frame(height: 80)
        }
        .refreshable { await viewModel.refresh() }
    }
}

// MARK: - Skeleton

/// Placeholder card matching `BookGridCard` layout, shown while loading the next page.
private struct BookGridCardSkeleton: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            // Cover placeholder (2:3 aspect ratio)
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
                .aspectRatio(2 / 3, contentMode: .fit)
                .frame(maxWidth: .infinity)

            // Title placeholder
            RoundedRectangle(cornerRadius: 4)
                .fill(.fill.tertiary)
                .frame(height: 14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.trailing, 24)

            // Author placeholder
            RoundedRectangle(cornerRadius: 4)
                .fill(.fill.tertiary)
                .frame(width: 80, height: 12)
        }
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
        LibraryView()
    }
}
