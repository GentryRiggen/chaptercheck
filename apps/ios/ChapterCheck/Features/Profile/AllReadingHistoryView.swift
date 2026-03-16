import SwiftUI

/// Paginated list of all books a user has marked as read.
struct AllReadingHistoryView: View {
    let userId: String

    @State private var viewModel = AllReadingHistoryViewModel()
    @State private var searchText = ""

    private var filteredBooks: [UserReadBook] {
        guard !searchText.isEmpty else { return viewModel.books }
        let query = searchText.lowercased()
        return viewModel.books.filter { book in
            book.title.lowercased().contains(query)
                || book.authors.contains { $0.name.lowercased().contains(query) }
        }
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.books.isEmpty {
                LoadingView(message: "Loading reading history...")
            } else if let error = viewModel.error, viewModel.books.isEmpty {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe(userId: userId)
                }
            } else if viewModel.books.isEmpty {
                EmptyStateView(
                    icon: "book.closed",
                    title: "No Books",
                    subtitle: "No reading history yet."
                )
            } else {
                bookList
            }
        }
        .navigationTitle("Reading History")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search books")
        .onAppear { viewModel.subscribe(userId: userId) }
        .onDisappear { viewModel.unsubscribe() }
    }

    private var bookList: some View {
        List {
            if !searchText.isEmpty && filteredBooks.isEmpty {
                ContentUnavailableView.search(text: searchText)
                    .listRowSeparator(.hidden)
            } else {
                ForEach(filteredBooks) { book in
                    LibraryBookCard(book: book)
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
    }
}
