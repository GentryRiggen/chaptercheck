import SwiftUI

/// Unified search screen for books, authors, series, and profiles.
///
/// Pushes onto the navigation stack from the home screen. Shows a searchable
/// list with debounced queries returning book, author, series, and user results.
/// Filter pills allow narrowing results to a specific category.
/// When the query is empty, shows quick links to browse the full library.
struct SearchView: View {
    @State private var viewModel = SearchViewModel()
    @FocusState private var isSearchFocused: Bool
    private let networkMonitor = NetworkMonitor.shared

    var body: some View {
        Group {
            if !networkMonitor.isConnected {
                offlineContent
            } else if viewModel.isSearchActive {
                searchResults
            } else {
                browseLinks
            }
        }
        .navigationTitle("Search")
        .searchable(
            text: $viewModel.searchText,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: "Books, authors, series, profiles..."
        )
        .onChange(of: viewModel.searchText) {
            viewModel.onSearchTextChanged()
        }
        .searchFocused($isSearchFocused)
        .onAppear {
            isSearchFocused = true
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    // MARK: - Search Results

    @ViewBuilder
    private var searchResults: some View {
        if viewModel.isLoading && !viewModel.hasResults {
            LoadingView(message: "Searching...")
        } else if let error = viewModel.error {
            ErrorView(message: error) {
                viewModel.onSearchTextChanged()
            }
        } else if !viewModel.hasResults {
            ContentUnavailableView.search(text: viewModel.searchText)
        } else {
            VStack(spacing: 0) {
                filterPills
                filteredResultsList
            }
        }
    }

    // MARK: - Filter Pills

    private var filterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(viewModel.availableFilters, id: \.self) { filter in
                    filterPill(filter)
                }
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
    }

    private func filterPill(_ filter: SearchFilter) -> some View {
        let isSelected = viewModel.selectedFilter == filter
        return Text(filter.rawValue)
            .font(.subheadline)
            .fontWeight(isSelected ? .semibold : .regular)
            .padding(.horizontal, 14)
            .padding(.vertical, 7)
            .background(isSelected ? Color.accentColor : Color(.systemGray5))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(Capsule())
            .onTapGesture {
                withAnimation(.easeInOut(duration: 0.2)) {
                    viewModel.selectedFilter = filter
                }
            }
    }

    // MARK: - Filtered Results List

    @ViewBuilder
    private var filteredResultsList: some View {
        let showBooks = (viewModel.selectedFilter == .all || viewModel.selectedFilter == .books) && !viewModel.bookResults.isEmpty
        let showAuthors = (viewModel.selectedFilter == .all || viewModel.selectedFilter == .authors) && !viewModel.authorResults.isEmpty
        let showSeries = (viewModel.selectedFilter == .all || viewModel.selectedFilter == .series) && !viewModel.seriesResults.isEmpty
        let showProfiles = (viewModel.selectedFilter == .all || viewModel.selectedFilter == .profiles) && !viewModel.userResults.isEmpty

        List {
            if showBooks {
                Section("Books") {
                    ForEach(viewModel.bookResults) { book in
                        NavigationLink(value: AppDestination.book(id: book._id)) {
                            bookRow(book)
                        }
                    }
                }
            }

            if showAuthors {
                Section("Authors") {
                    ForEach(viewModel.authorResults) { author in
                        NavigationLink(value: AppDestination.author(id: author._id)) {
                            authorRow(author)
                        }
                    }
                }
            }

            if showSeries {
                Section("Series") {
                    ForEach(viewModel.seriesResults) { series in
                        NavigationLink(value: AppDestination.series(id: series._id)) {
                            seriesRow(series)
                        }
                    }
                }
            }

            if showProfiles {
                Section("Profiles") {
                    ForEach(viewModel.userResults) { user in
                        NavigationLink(value: AppDestination.profile(userId: user._id)) {
                            userRow(user)
                        }
                    }
                }
            }

            Color.clear
                .frame(height: 80)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
        }
        .listStyle(.plain)
    }

    // MARK: - Book Row

    private func bookRow(_ book: BookWithDetails) -> some View {
        HStack(spacing: 12) {
            BookCoverView(r2Key: book.coverImageR2Key, size: 44)

            VStack(alignment: .leading, spacing: 2) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                if let authorName = book.authors.first?.name {
                    Text(authorName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                RatingView(rating: book.averageRating, size: 10)
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Author Row

    private func authorRow(_ author: AuthorWithCounts) -> some View {
        HStack(spacing: 12) {
            SearchAuthorImageView(r2Key: author.imageR2Key, size: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(author.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text("\(author.bookCountInt) \(author.bookCountInt == 1 ? "book" : "books")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - Series Row

    private func seriesRow(_ series: SearchSeries) -> some View {
        HStack(spacing: 12) {
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: "books.vertical")
                        .font(.system(size: 16))
                        .foregroundStyle(.secondary)
                }

            VStack(alignment: .leading, spacing: 2) {
                Text(series.name)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                Text("\(series.bookCountInt) \(series.bookCountInt == 1 ? "book" : "books")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 2)
    }

    // MARK: - User Row

    private func userRow(_ user: SearchUser) -> some View {
        HStack(spacing: 12) {
            if let imageUrl = user.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        userAvatarPlaceholder
                    }
                }
                .frame(width: 40, height: 40)
                .clipShape(Circle())
            } else {
                userAvatarPlaceholder
            }

            Text(user.displayName)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(1)
        }
        .padding(.vertical, 2)
    }

    private var userAvatarPlaceholder: some View {
        Circle()
            .fill(.fill.tertiary)
            .frame(width: 40, height: 40)
            .overlay {
                Image(systemName: "person.fill")
                    .font(.system(size: 16))
                    .foregroundStyle(.secondary)
            }
    }

    // MARK: - Offline

    private var offlineContent: some View {
        VStack(spacing: 20) {
            OfflineBanner()
                .padding(.top, 12)

            ContentUnavailableView(
                "Search Unavailable Offline",
                systemImage: "magnifyingglass",
                description: Text("Connect to the internet to search your library.")
            )
        }
    }

    // MARK: - Browse Links (empty query state)

    private var browseLinks: some View {
        List {
            Section("Browse") {
                NavigationLink(value: AppDestination.browseLibrary()) {
                    Label("All Books", systemImage: "books.vertical")
                }
                NavigationLink(value: AppDestination.browseAuthors) {
                    Label("All Authors", systemImage: "person.2")
                }
            }
        }
        .listStyle(.insetGrouped)
    }
}

// MARK: - Author Image View

/// Small circular author image for search results.
private struct SearchAuthorImageView: View {
    let r2Key: String?
    let size: CGFloat

    @State private var imageUrl: URL?

    var body: some View {
        Group {
            if let imageUrl {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .task {
            guard let r2Key else { return }
            imageUrl = await ImageRepository.shared.getImageUrl(r2Key: r2Key)
        }
    }

    private var placeholder: some View {
        Circle()
            .fill(.fill.tertiary)
            .overlay {
                Image(systemName: "person.fill")
                    .font(.system(size: size * 0.4))
                    .foregroundStyle(.secondary)
            }
    }
}

#Preview {
    NavigationStack {
        SearchView()
    }
}
