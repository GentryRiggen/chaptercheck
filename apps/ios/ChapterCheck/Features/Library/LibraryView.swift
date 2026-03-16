import Combine
import ConvexMobile
import SwiftUI

/// Unified Library discovery hub.
///
/// Four browseable categories — Books, Authors, Series, Shelves — selected via
/// horizontally-scrollable capsule pills at the top of the screen.
///
/// When the search field contains text, all four categories are searched
/// simultaneously via the `searchAll` Convex query and results are displayed
/// in labelled sections.
struct LibraryView: View {
    var initialSort: SortOption = .titleAsc

    @State private var viewModel = LibraryViewModel()
    @State private var isGenreFilterPresented = false
    @State private var isAddBookPresented = false
    @State private var isCreateShelfPresented = false
    @State private var createdShelfId: String?
    @State private var navigateToNewShelfId: String?
    @State private var currentUser: UserWithPermissions?
    @State private var userCancellable: AnyCancellable?
    @Environment(DownloadManager.self) private var downloadManager
    private let networkMonitor = NetworkMonitor.shared
    private let userRepository = UserRepository()

    private let twoColumnGrid = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        Group {
            if viewModel.isUnifiedSearchMode {
                unifiedSearchContent
            } else {
                categoryContent
            }
        }
        .navigationTitle("Library")
        .searchable(
            text: $viewModel.searchText,
            placement: .navigationBarDrawer(displayMode: .always),
            prompt: viewModel.isOffline ? "Search unavailable offline" : "Search library..."
        )
        .onChange(of: viewModel.searchText) {
            viewModel.onSearchTextChanged()
        }
        .onChange(of: viewModel.bookSortOption) {
            viewModel.onSortChanged()
        }
        .onChange(of: viewModel.selectedGenreIds) {
            viewModel.onGenreFilterChanged()
        }
        .onChange(of: viewModel.authorSortOption) {
            viewModel.onAuthorSortChanged()
        }
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                toolbarContent
            }
        }
        .sheet(isPresented: $isGenreFilterPresented) {
            GenreFilterSheet(selectedGenreIds: $viewModel.selectedGenreIds)
        }
        .sheet(isPresented: $isAddBookPresented) {
            AddBookView { _ in isAddBookPresented = false }
        }
        .sheet(isPresented: $isCreateShelfPresented, onDismiss: {
            if let shelfId = createdShelfId {
                createdShelfId = nil
                navigateToNewShelfId = shelfId
            }
        }) {
            ShelfFormSheet(onCreated: { shelfId in createdShelfId = shelfId })
        }
        .navigationDestination(item: $navigateToNewShelfId) { shelfId in
            ShelfDetailView(shelfId: shelfId)
        }
        .onAppear {
            viewModel.downloadManager = downloadManager
            viewModel.bookSortOption = initialSort
            viewModel.subscribe()
            subscribeToUser()
        }
        .onDisappear {
            viewModel.unsubscribe()
            userCancellable?.cancel()
            userCancellable = nil
        }
        .onChange(of: networkMonitor.isConnected) { _, isConnected in
            if isConnected { viewModel.recoverFromOffline() }
        }
    }

    // MARK: - Toolbar

    @ViewBuilder
    private var toolbarContent: some View {
        if !viewModel.isUnifiedSearchMode {
            HStack(spacing: 4) {
                if viewModel.selectedCategory == .books {
                    if currentUser?.permissions.canCreateContent == true {
                        Button { isAddBookPresented = true } label: {
                            Image(systemName: "plus")
                        }
                        .accessibilityLabel("Add book")
                    }

                    Button {
                        isGenreFilterPresented = true
                    } label: {
                        Image(
                            systemName: viewModel.isGenreFilterActive
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

                    SortPicker(selection: $viewModel.bookSortOption)
                }

                if viewModel.selectedCategory == .authors {
                    authorSortMenu
                }

                if viewModel.selectedCategory == .series {
                    seriesSortMenu
                }

                if viewModel.selectedCategory == .shelves {
                    Button { isCreateShelfPresented = true } label: {
                        Image(systemName: "plus")
                    }
                    .accessibilityLabel("Create bookshelf")

                    shelfSortMenu
                }
            }
        }
    }

    private var authorSortMenu: some View {
        Menu {
            ForEach(AuthorSortOption.allCases) { option in
                Button {
                    viewModel.authorSortOption = option
                } label: {
                    if option == viewModel.authorSortOption {
                        Label(option.displayName, systemImage: "checkmark")
                    } else {
                        Label(option.displayName, systemImage: option.icon)
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "arrow.up.arrow.down")
                Text(viewModel.authorSortOption.displayName)
                    .font(.subheadline)
            }
        }
    }

    private var seriesSortMenu: some View {
        Menu {
            ForEach(SeriesSortOption.allCases) { option in
                Button {
                    viewModel.seriesSortOption = option
                } label: {
                    if option == viewModel.seriesSortOption {
                        Label(option.displayName, systemImage: "checkmark")
                    } else {
                        Label(option.displayName, systemImage: option.icon)
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "arrow.up.arrow.down")
                Text(viewModel.seriesSortOption.displayName)
                    .font(.subheadline)
            }
        }
    }

    private var shelfSortMenu: some View {
        Menu {
            ForEach(ShelfSortOption.allCases) { option in
                Button {
                    viewModel.shelfSortOption = option
                } label: {
                    if option == viewModel.shelfSortOption {
                        Label(option.displayName, systemImage: "checkmark")
                    } else {
                        Label(option.displayName, systemImage: option.icon)
                    }
                }
            }
        } label: {
            HStack(spacing: 4) {
                Image(systemName: "arrow.up.arrow.down")
                Text(viewModel.shelfSortOption.displayName)
                    .font(.subheadline)
            }
        }
    }

    // MARK: - Search Sort Menus

    private var searchBookSortMenu: some View {
        Menu {
            ForEach(SearchBookSort.allCases) { option in
                Button {
                    viewModel.searchBookSort = option
                } label: {
                    if option == viewModel.searchBookSort {
                        Label(option.displayName, systemImage: "checkmark")
                    } else {
                        Label(option.displayName, systemImage: option.icon)
                    }
                }
            }
        } label: {
            HStack(spacing: 3) {
                Image(systemName: "arrow.up.arrow.down")
                    .font(.caption)
                Text(viewModel.searchBookSort.displayName)
                    .font(.subheadline)
            }
            .foregroundStyle(Color.accentColor)
        }
    }

    private var searchAuthorSortMenu: some View {
        Menu {
            ForEach(SearchAuthorSort.allCases) { option in
                Button {
                    viewModel.searchAuthorSort = option
                } label: {
                    if option == viewModel.searchAuthorSort {
                        Label(option.displayName, systemImage: "checkmark")
                    } else {
                        Label(option.displayName, systemImage: option.icon)
                    }
                }
            }
        } label: {
            HStack(spacing: 3) {
                Image(systemName: "arrow.up.arrow.down")
                    .font(.caption)
                Text(viewModel.searchAuthorSort.displayName)
                    .font(.subheadline)
            }
            .foregroundStyle(Color.accentColor)
        }
    }

    // MARK: - Category Pills

    private var categoryPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 10) {
                ForEach(LibraryCategory.allCases) { category in
                    Button {
                        Haptics.light()
                        withAnimation(.easeInOut(duration: 0.2)) {
                            viewModel.selectedCategory = category
                        }
                        viewModel.onCategoryChanged()
                    } label: {
                        Label(category.label, systemImage: category.icon)
                            .font(.subheadline.weight(.medium))
                            .padding(.horizontal, 14)
                            .padding(.vertical, 8)
                            .background(
                                viewModel.selectedCategory == category
                                    ? Color.accentColor
                                    : Color(.tertiarySystemFill)
                            )
                            .foregroundStyle(
                                viewModel.selectedCategory == category
                                    ? Color.white
                                    : Color.secondary
                            )
                            .clipShape(Capsule())
                    }
                    .buttonStyle(.plain)
                    .accessibilityAddTraits(
                        viewModel.selectedCategory == category ? .isSelected : []
                    )
                }
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Per-Category Content

    @ViewBuilder
    private var categoryContent: some View {
        ScrollView {
            VStack(spacing: 0) {
                categoryPills

                switch viewModel.selectedCategory {
                case .books:
                    booksContent
                case .authors:
                    authorsContent
                case .series:
                    seriesContent
                case .shelves:
                    shelvesContent
                }
            }
        }
        .refreshable { await viewModel.refresh() }
    }

    // MARK: - Books Content

    @ViewBuilder
    private var booksContent: some View {
        if viewModel.isOffline {
            OfflineBanner()
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal)
                .padding(.top, 4)
        }

        if viewModel.isBookLoading && viewModel.books.isEmpty {
            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                ForEach(0..<6, id: \.self) { _ in BookGridCardSkeleton() }
            }
            .padding(.horizontal)
            .padding(.top, 8)
        } else if let error = viewModel.bookError, viewModel.books.isEmpty {
            ErrorStateInline(message: error) {
                viewModel.retryBooks()
            }
        } else if viewModel.books.isEmpty {
            EmptyStateInline(
                icon: "books.vertical",
                title: "No Books Found",
                subtitle: viewModel.isGenreFilterActive
                    ? "No books found for the selected genres."
                    : "Your library is empty."
            )
        } else {
            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                ForEach(viewModel.books) { book in
                    NavigationLink(value: AppDestination.book(id: book._id)) {
                        BookGridCard(book: book)
                    }
                    .buttonStyle(.plain)
                    .onAppear {
                        if book._id == viewModel.books.last?._id {
                            viewModel.loadNextBookPage()
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)

            if viewModel.isLoadingMore {
                LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                    ForEach(0..<4, id: \.self) { _ in BookGridCardSkeleton() }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
        }

        Spacer().frame(height: 80)
    }

    // MARK: - Authors Content

    @ViewBuilder
    private var authorsContent: some View {
        if viewModel.isAuthorLoading && viewModel.authors.isEmpty {
            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                ForEach(0..<6, id: \.self) { _ in AuthorGridCardSkeleton() }
            }
            .padding(.horizontal)
            .padding(.top, 8)
        } else if let error = viewModel.authorError, viewModel.authors.isEmpty {
            ErrorStateInline(message: error) {
                viewModel.retryAuthors()
            }
        } else if viewModel.authors.isEmpty {
            EmptyStateInline(
                icon: "person.2",
                title: "No Authors Found",
                subtitle: "No authors in your library yet."
            )
        } else {
            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                ForEach(viewModel.authors) { author in
                    NavigationLink(value: AppDestination.author(id: author._id)) {
                        AuthorGridCard(author: author)
                    }
                    .buttonStyle(.plain)
                    .onAppear {
                        if author._id == viewModel.authors.last?._id {
                            viewModel.loadNextAuthorPage()
                        }
                    }
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)

            if viewModel.isLoadingMoreAuthors {
                LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                    ForEach(0..<4, id: \.self) { _ in AuthorGridCardSkeleton() }
                }
                .padding(.horizontal)
                .padding(.top, 8)
            }
        }

        Spacer().frame(height: 80)
    }

    // MARK: - Series Content

    @ViewBuilder
    private var seriesContent: some View {
        if viewModel.isSeriesLoading && viewModel.seriesList.isEmpty {
            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                ForEach(0..<6, id: \.self) { _ in SeriesCardSkeleton() }
            }
            .padding(.horizontal)
            .padding(.top, 8)
        } else if let error = viewModel.seriesError, viewModel.seriesList.isEmpty {
            ErrorStateInline(message: error) {
                viewModel.retrySeries()
            }
        } else if viewModel.seriesList.isEmpty {
            EmptyStateInline(
                icon: "books.vertical",
                title: "No Series",
                subtitle: "No series in your library yet."
            )
        } else {
            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                ForEach(viewModel.sortedSeriesList) { series in
                    NavigationLink(value: AppDestination.series(id: series._id)) {
                        SeriesCard(series: series)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
        }

        Spacer().frame(height: 80)
    }

    // MARK: - Shelves Content

    @ViewBuilder
    private var shelvesContent: some View {
        if viewModel.isShelvesLoading && viewModel.shelves.isEmpty {
            LoadingView(message: "Loading bookshelves...")
                .padding(.top, 40)
        } else if let error = viewModel.shelvesError, viewModel.shelves.isEmpty {
            ErrorStateInline(message: error) {
                viewModel.retryShelves()
            }
        } else if viewModel.shelves.isEmpty {
            shelvesEmptyState
        } else {
            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                ForEach(viewModel.sortedShelves) { shelf in
                    NavigationLink(value: AppDestination.shelf(id: shelf._id)) {
                        ShelfCard(shelf: shelf)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)
        }

        Spacer().frame(height: 80)
    }

    private var shelvesEmptyState: some View {
        VStack(spacing: 12) {
            Image(systemName: "tray.2")
                .font(.system(size: 40))
                .foregroundStyle(.secondary)

            Text("No Bookshelves Yet")
                .font(.title3)
                .fontWeight(.semibold)

            Text("Create a bookshelf to organize your audiobooks into custom collections.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                isCreateShelfPresented = true
            } label: {
                Text("Create Bookshelf")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .padding(.horizontal, 20)
                    .padding(.vertical, 10)
                    .background(.tint)
                    .foregroundStyle(.white)
                    .clipShape(Capsule())
            }
            .padding(.top, 4)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
        .padding(.horizontal)
    }

    // MARK: - Unified Search Content

    @ViewBuilder
    private var unifiedSearchContent: some View {
        if viewModel.isUnifiedSearchLoading && !viewModel.hasUnifiedResults {
            LoadingView(message: "Searching...")
        } else if let error = viewModel.unifiedSearchError {
            ErrorView(message: error) {
                viewModel.onSearchTextChanged()
            }
        } else if viewModel.unifiedBooks.isEmpty && viewModel.unifiedAuthors.isEmpty && viewModel.unifiedSeries.isEmpty {
            EmptyStateView(
                icon: "magnifyingglass",
                title: "No Results",
                subtitle: "Nothing matched \"\(viewModel.searchText.trimmingCharacters(in: .whitespaces))\"."
            )
        } else {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    searchFilterPills

                    if !viewModel.hasUnifiedResults {
                        EmptyStateInline(
                            icon: "magnifyingglass",
                            title: "No \(viewModel.searchFilterCategory?.label ?? "") Results",
                            subtitle: "No matches in this category."
                        )
                    }

                    let showBooks = !viewModel.unifiedBooks.isEmpty
                        && (viewModel.searchFilterCategory == nil || viewModel.searchFilterCategory == .books)
                    let showAuthors = !viewModel.unifiedAuthors.isEmpty
                        && (viewModel.searchFilterCategory == nil || viewModel.searchFilterCategory == .authors)
                    let showSeries = !viewModel.unifiedSeries.isEmpty
                        && (viewModel.searchFilterCategory == nil || viewModel.searchFilterCategory == .series)

                    if showBooks {
                        searchSection(
                            title: "Books",
                            count: viewModel.unifiedBooks.count
                        ) {
                            searchBookSortMenu
                        } content: {
                            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                                ForEach(viewModel.sortedUnifiedBooks) { book in
                                    NavigationLink(value: AppDestination.book(id: book._id)) {
                                        BookGridCard(book: book)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                    if showAuthors {
                        searchSection(
                            title: "Authors",
                            count: viewModel.unifiedAuthors.count
                        ) {
                            searchAuthorSortMenu
                        } content: {
                            LazyVGrid(columns: twoColumnGrid, spacing: 16) {
                                ForEach(viewModel.sortedUnifiedAuthors) { author in
                                    NavigationLink(value: AppDestination.author(id: author._id)) {
                                        AuthorGridCard(author: author)
                                    }
                                    .buttonStyle(.plain)
                                }
                            }
                        }
                    }

                    if showSeries {
                        searchSection(
                            title: "Series",
                            count: viewModel.unifiedSeries.count
                        ) {
                            LazyVStack(spacing: 0) {
                                ForEach(viewModel.unifiedSeries) { series in
                                    NavigationLink(value: AppDestination.series(id: series._id)) {
                                        HStack {
                                            VStack(alignment: .leading, spacing: 2) {
                                                Text(series.name)
                                                    .font(.subheadline)
                                                    .fontWeight(.medium)
                                                    .foregroundStyle(.primary)
                                                    .lineLimit(1)

                                                Text(seriesSubtitle(series))
                                                    .font(.caption)
                                                    .foregroundStyle(.secondary)
                                            }

                                            Spacer()

                                            Image(systemName: "chevron.right")
                                                .font(.caption)
                                                .foregroundStyle(.tertiary)
                                        }
                                        .padding(.vertical, 10)
                                    }
                                    .buttonStyle(.plain)

                                    Divider()
                                }
                            }
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.top, 4)

                Spacer().frame(height: 80)
            }
        }
    }

    // MARK: - Search Filter Pills

    private var searchFilterPills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                searchFilterPill(label: "All", icon: nil, isSelected: viewModel.searchFilterCategory == nil) {
                    viewModel.searchFilterCategory = nil
                }

                if !viewModel.unifiedBooks.isEmpty {
                    searchFilterPill(
                        label: "Books",
                        icon: "book.closed",
                        count: viewModel.unifiedBooks.count,
                        isSelected: viewModel.searchFilterCategory == .books
                    ) {
                        viewModel.searchFilterCategory = viewModel.searchFilterCategory == .books ? nil : .books
                    }
                }

                if !viewModel.unifiedAuthors.isEmpty {
                    searchFilterPill(
                        label: "Authors",
                        icon: "person.2",
                        count: viewModel.unifiedAuthors.count,
                        isSelected: viewModel.searchFilterCategory == .authors
                    ) {
                        viewModel.searchFilterCategory = viewModel.searchFilterCategory == .authors ? nil : .authors
                    }
                }

                if !viewModel.unifiedSeries.isEmpty {
                    searchFilterPill(
                        label: "Series",
                        icon: "books.vertical",
                        count: viewModel.unifiedSeries.count,
                        isSelected: viewModel.searchFilterCategory == .series
                    ) {
                        viewModel.searchFilterCategory = viewModel.searchFilterCategory == .series ? nil : .series
                    }
                }
            }
        }
    }

    private func searchFilterPill(
        label: String,
        icon: String?,
        count: Int? = nil,
        isSelected: Bool,
        action: @escaping () -> Void
    ) -> some View {
        Button {
            Haptics.light()
            withAnimation(.easeInOut(duration: 0.2)) {
                action()
            }
        } label: {
            HStack(spacing: 4) {
                if let icon {
                    Image(systemName: icon)
                        .font(.caption2)
                }
                Text(label)
                if let count {
                    Text("(\(count))")
                        .foregroundStyle(isSelected ? .white.opacity(0.7) : .secondary)
                }
            }
            .font(.subheadline.weight(.medium))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Color.accentColor : Color(.tertiarySystemFill))
            .foregroundStyle(isSelected ? .white : .secondary)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    // MARK: - Search Section Builder

    private func searchSection<Content: View>(
        title: String,
        count: Int,
        @ViewBuilder sortMenu: () -> some View = { EmptyView() },
        @ViewBuilder content: () -> Content
    ) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text(title)
                    .font(.headline)

                Text("(\(count))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)

                Spacer()

                sortMenu()
            }

            content()
        }
    }

    private func seriesSubtitle(_ series: SearchSeries) -> String {
        let count = series.bookCountInt
        return "\(count) \(count == 1 ? "book" : "books")"
    }

    // MARK: - User Subscription

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
}

// MARK: - Inline Empty State

/// Compact empty-state for use inside a category scroll view.
private struct EmptyStateInline: View {
    let icon: String
    let title: String
    let subtitle: String

    var body: some View {
        VStack(spacing: 10) {
            Image(systemName: icon)
                .font(.system(size: 36))
                .foregroundStyle(.secondary)

            Text(title)
                .font(.headline)

            Text(subtitle)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
        .padding(.horizontal)
    }
}

// MARK: - Inline Error State

/// Compact error view with retry button for inline use inside a scroll view.
private struct ErrorStateInline: View {
    let message: String
    let retry: () -> Void

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 36))
                .foregroundStyle(.secondary)

            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("Try Again", action: retry)
                .font(.subheadline.weight(.medium))
        }
        .frame(maxWidth: .infinity)
        .padding(.top, 60)
        .padding(.horizontal)
    }
}

// MARK: - Author Grid Card Skeleton

/// Placeholder card matching `AuthorGridCard` layout, shown while paginating.
private struct AuthorGridCardSkeleton: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .center, spacing: 8) {
            Circle()
                .fill(.fill.tertiary)
                .frame(width: 80, height: 80)

            RoundedRectangle(cornerRadius: 4)
                .fill(.fill.tertiary)
                .frame(width: 90, height: 14)

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

// MARK: - Book Grid Card Skeleton

/// Placeholder card matching `BookGridCard` layout, shown while paginating.
private struct BookGridCardSkeleton: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
                .aspectRatio(2 / 3, contentMode: .fit)
                .frame(maxWidth: .infinity)

            RoundedRectangle(cornerRadius: 4)
                .fill(.fill.tertiary)
                .frame(height: 14)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.trailing, 24)

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

// MARK: - Series Card

/// Rich card for a series in the grid — stacked covers, name, author names, book count.
private struct SeriesCard: View {
    let series: SeriesWithPreview

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            StackedCoversView(
                previewBooks: series.previewCovers.map {
                    ShelfPreviewBook(_id: $0._id, title: "", coverImageR2Key: $0.coverImageR2Key)
                },
                size: coverSize
            )

            VStack(alignment: .leading, spacing: 3) {
                Text(series.name)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)

                if !series.authors.isEmpty {
                    Text(series.authors.map(\.name).joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Text(bookCountLabel)
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    private var coverSize: CGFloat {
        (UIScreen.main.bounds.width / 2) - 48
    }

    private var bookCountLabel: String {
        let count = series.bookCountInt
        return "\(count) \(count == 1 ? "book" : "books")"
    }
}

// MARK: - Series Card Skeleton

private struct SeriesCardSkeleton: View {
    @State private var isAnimating = false

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
                .aspectRatio(2 / 3, contentMode: .fit)
                .frame(maxWidth: .infinity)

            VStack(alignment: .leading, spacing: 4) {
                RoundedRectangle(cornerRadius: 4)
                    .fill(.fill.tertiary)
                    .frame(height: 14)
                    .padding(.trailing, 20)

                RoundedRectangle(cornerRadius: 4)
                    .fill(.fill.tertiary)
                    .frame(width: 100, height: 12)

                RoundedRectangle(cornerRadius: 4)
                    .fill(.fill.tertiary)
                    .frame(width: 60, height: 10)
            }
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
