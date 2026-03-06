import SwiftUI

/// Paginated list of all books a user has marked as read.
struct AllReadingHistoryView: View {
    let userId: String

    @State private var viewModel = AllReadingHistoryViewModel()

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
        .onAppear { viewModel.subscribe(userId: userId) }
        .onDisappear { viewModel.unsubscribe() }
    }

    private var bookList: some View {
        List {
            ForEach(viewModel.books) { book in
                LibraryBookCard(book: book)
                    .onAppear {
                        if book._id == viewModel.books.last?._id {
                            viewModel.loadNextPage()
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
        .contentMargins(.bottom, 80)
    }
}
