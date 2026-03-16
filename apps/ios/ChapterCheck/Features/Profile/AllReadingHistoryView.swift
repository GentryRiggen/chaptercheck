import SwiftUI

/// Paginated list of all books in a user's library with status filtering.
///
/// Shows horizontally scrollable filter chips (All, Want to Read, Reading,
/// Finished, Paused, DNF) and a searchable list with status badges on each row.
struct AllReadingHistoryView: View {
    let userId: String
    let initialStatus: ReadingStatus?

    @State private var viewModel = AllReadingHistoryViewModel()
    @State private var searchText = ""
    @Environment(ThemeManager.self) private var themeManager

    init(userId: String, initialStatus: ReadingStatus? = nil) {
        self.userId = userId
        self.initialStatus = initialStatus
    }

    private var filteredBooks: [UserBookWithStatus] {
        guard !searchText.isEmpty else { return viewModel.books }
        let query = searchText.lowercased()
        return viewModel.books.filter { book in
            book.title.lowercased().contains(query)
                || book.authors.contains { $0.name.lowercased().contains(query) }
        }
    }

    private var navigationTitle: String {
        if let status = viewModel.selectedStatus {
            return status.label
        }
        return "All Books"
    }

    var body: some View {
        List {
            // Filter chips
            Section {
                statusFilterChips
                    .listRowInsets(EdgeInsets(top: 4, leading: 0, bottom: 4, trailing: 0))
                    .listRowBackground(Color.clear)
                    .listRowSeparator(.hidden)
            }

            if viewModel.isLoading && viewModel.books.isEmpty {
                LoadingView(message: "Loading books...")
                    .listRowSeparator(.hidden)
                    .listRowBackground(Color.clear)
                    .frame(maxWidth: .infinity, minHeight: 300)
            } else if let error = viewModel.error, viewModel.books.isEmpty {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe(userId: userId, initialStatus: initialStatus)
                }
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
                .frame(maxWidth: .infinity, minHeight: 300)
            } else if viewModel.books.isEmpty {
                ContentUnavailableView(
                    "No Books",
                    systemImage: "book.closed",
                    description: Text(emptyMessage)
                )
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
                .frame(maxWidth: .infinity, minHeight: 300)
            } else if !searchText.isEmpty && filteredBooks.isEmpty {
                ContentUnavailableView.search(text: searchText)
                    .listRowSeparator(.hidden)
            } else {
                ForEach(filteredBooks) { book in
                    NavigationLink(value: AppDestination.book(id: book._id)) {
                        bookRow(book)
                    }
                    .onAppear {
                        if searchText.isEmpty, book._id == viewModel.books.last?._id {
                            viewModel.loadNextPage()
                        }
                    }
                }
            }

            if viewModel.isLoadingMore {
                HStack {
                    Spacer()
                    ProgressView()
                    Spacer()
                }
                .listRowSeparator(.hidden)
            }
        }
        .listStyle(.insetGrouped)
        .refreshable { await viewModel.refresh() }
        .contentMargins(.bottom, 80)
        .navigationTitle(navigationTitle)
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search books")
        .onAppear { viewModel.subscribe(userId: userId, initialStatus: initialStatus) }
        .onDisappear { viewModel.unsubscribe() }
    }

    private var emptyMessage: String {
        if let status = viewModel.selectedStatus {
            return "No \(status.label.lowercased()) books yet."
        }
        return "No books in your library yet."
    }

    // MARK: - Filter Chips

    private var statusFilterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                filterChip(label: "All", status: nil)
                ForEach(ReadingStatus.allCases) { status in
                    filterChip(label: status.label, status: status)
                }
            }
            .padding(.horizontal, 16)
        }
    }

    private func filterChip(label: String, status: ReadingStatus?) -> some View {
        let isSelected = viewModel.selectedStatus == status
        return Button {
            viewModel.selectStatus(status)
        } label: {
            HStack(spacing: 4) {
                if let status {
                    Image(systemName: status.icon)
                        .font(.caption2)
                }
                Text(label)
                    .font(.subheadline)
                    .fontWeight(isSelected ? .semibold : .regular)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? themeManager.accentColor : Color(.tertiarySystemFill))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
        .accessibilityLabel(label)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    // MARK: - Book Row

    private func bookRow(_ book: UserBookWithStatus) -> some View {
        HStack(spacing: 12) {
            BookCoverView(r2Key: book.coverImageR2Key, size: 56)

            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                if !book.authors.isEmpty {
                    Text(book.authors.map(\.name).joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack(spacing: 6) {
                    if let status = book.readingStatus {
                        Label(status.label, systemImage: status.icon)
                            .font(.caption2)
                            .foregroundStyle(status.color)
                    }

                    if let rating = book.userRating {
                        RatingView(rating: rating, size: 10)
                    }

                    if book.isReadPrivate {
                        Image(systemName: "eye.slash")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()
        }
        .padding(.vertical, 2)
    }
}
