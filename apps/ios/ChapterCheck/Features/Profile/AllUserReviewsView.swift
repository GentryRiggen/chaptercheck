import SwiftUI

/// Paginated list of all reviews by a user.
struct AllUserReviewsView: View {
    let userId: String

    @State private var viewModel = AllUserReviewsViewModel()
    @State private var searchText = ""

    private var filteredReviews: [UserReview] {
        guard !searchText.isEmpty else { return viewModel.reviews }
        let query = searchText.lowercased()
        return viewModel.reviews.filter { review in
            review.book?.title.lowercased().contains(query) == true
                || review.book?.authors.contains { $0.name.lowercased().contains(query) } == true
                || review.reviewText?.lowercased().contains(query) == true
        }
    }

    var body: some View {
        Group {
            if viewModel.isLoading && viewModel.reviews.isEmpty {
                LoadingView(message: "Loading reviews...")
            } else if let error = viewModel.error, viewModel.reviews.isEmpty {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe(userId: userId)
                }
            } else if viewModel.reviews.isEmpty {
                EmptyStateView(
                    icon: "star",
                    title: "No Reviews",
                    subtitle: "No reviews yet."
                )
            } else {
                reviewList
            }
        }
        .navigationTitle("Reviews")
        .navigationBarTitleDisplayMode(.inline)
        .searchable(text: $searchText, prompt: "Search reviews")
        .onAppear { viewModel.subscribe(userId: userId) }
        .onDisappear { viewModel.unsubscribe() }
    }

    private var reviewList: some View {
        List {
            if !searchText.isEmpty && filteredReviews.isEmpty {
                ContentUnavailableView.search(text: searchText)
                    .listRowSeparator(.hidden)
            } else {
                ForEach(filteredReviews) { review in
                    if let book = review.book {
                        NavigationLink(value: AppDestination.book(id: book._id)) {
                            reviewRow(review, book: book)
                        }
                        .onAppear {
                            if searchText.isEmpty, review._id == viewModel.reviews.last?._id {
                                viewModel.loadNextPage()
                            }
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

    private func reviewRow(_ review: UserReview, book: UserReviewBook) -> some View {
        HStack(alignment: .top, spacing: 10) {
            BookCoverView(r2Key: book.coverImageR2Key, size: 50)

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
                    if let rating = review.rating {
                        RatingView(rating: rating, size: 10)
                    }

                    if review.isReviewPrivate {
                        Label("Private", systemImage: "eye.slash")
                            .font(.caption2)
                            .foregroundStyle(.orange)
                    }

                    if let reviewedAt = review.reviewedAt {
                        Text(TimeFormatting.formatRelativeDate(reviewedAt))
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }
                }

                if let text = review.reviewText, !text.isEmpty {
                    Text(text)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(3)
                }
            }
        }
        .padding(.vertical, 2)
    }
}
