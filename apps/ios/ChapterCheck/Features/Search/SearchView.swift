import SwiftUI

/// Unified search screen for books and authors.
///
/// Pushes onto the navigation stack from the home screen. Shows a searchable
/// list with debounced queries returning both book and author results.
/// When the query is empty, shows quick links to browse the full library.
struct SearchView: View {
    @State private var viewModel = SearchViewModel()
    @FocusState private var isSearchFocused: Bool

    var body: some View {
        Group {
            if viewModel.isSearchActive {
                searchResults
            } else {
                browseLinks
            }
        }
        .navigationTitle("Search")
        .searchable(
            text: $viewModel.searchText,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: "Books, authors, series..."
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
            List {
                if !viewModel.bookResults.isEmpty {
                    Section("Books") {
                        ForEach(viewModel.bookResults) { book in
                            NavigationLink(value: AppDestination.book(id: book._id)) {
                                bookRow(book)
                            }
                        }
                    }
                }

                if !viewModel.authorResults.isEmpty {
                    Section("Authors") {
                        ForEach(viewModel.authorResults) { author in
                            NavigationLink(value: AppDestination.author(id: author._id)) {
                                authorRow(author)
                            }
                        }
                    }
                }

                if !viewModel.userResults.isEmpty {
                    Section("People") {
                        ForEach(viewModel.userResults) { user in
                            NavigationLink(value: AppDestination.profile(userId: user._id)) {
                                userRow(user)
                            }
                        }
                    }
                }
            }
            .listStyle(.plain)
        }
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
