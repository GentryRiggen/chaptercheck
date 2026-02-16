import SwiftUI

/// Series detail screen showing the series name, description, and ordered list of books.
struct SeriesDetailView: View {
    let seriesId: String

    @State private var viewModel = SeriesDetailViewModel()

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView()
            } else if let error = viewModel.error, viewModel.series == nil {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe(seriesId: seriesId)
                }
            } else if let series = viewModel.series {
                seriesContent(series)
            } else {
                EmptyStateView(
                    icon: "books.vertical",
                    title: "Series Not Found",
                    subtitle: "This series may have been removed."
                )
            }
        }
        .navigationTitle(viewModel.series?.name ?? "Series")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.subscribe(seriesId: seriesId)
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func seriesContent(_ series: Series) -> some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Header
                VStack(alignment: .leading, spacing: 8) {
                    Text(series.name)
                        .font(.title2)
                        .fontWeight(.bold)

                    Text("\(viewModel.books.count) \(viewModel.books.count == 1 ? "book" : "books")")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    if let description = series.description, !description.isEmpty {
                        Text(description)
                            .font(.body)
                            .foregroundStyle(.secondary)
                    }
                }
                .padding(.horizontal)

                Divider()
                    .padding(.horizontal)

                // Books list
                if viewModel.books.isEmpty {
                    EmptyStateView(
                        icon: "book.closed",
                        title: "No Books",
                        subtitle: "No books in this series yet."
                    )
                } else {
                    booksSection
                }

                // Bottom spacing for mini player
                Spacer()
                    .frame(height: 100)
            }
            .padding(.top)
        }
    }

    // MARK: - Books

    private var booksSection: some View {
        VStack(spacing: 0) {
            ForEach(viewModel.books) { book in
                NavigationLink(value: AppDestination.book(id: book._id)) {
                    seriesBookRow(book)
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func seriesBookRow(_ book: BookWithDetails) -> some View {
        HStack(spacing: 12) {
            // Series order badge
            if let order = book.seriesOrder {
                Text(formatSeriesOrder(order))
                    .font(.headline)
                    .fontWeight(.bold)
                    .foregroundStyle(.secondary)
                    .frame(width: 30, alignment: .center)
            }

            BookCoverView(r2Key: book.coverImageR2Key, size: 60)

            VStack(alignment: .leading, spacing: 4) {
                Text(book.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)

                if let authorName = book.authors.first?.name {
                    Text(authorName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack(spacing: 8) {
                    if let rating = book.averageRating, book.ratingCountInt > 0 {
                        HStack(spacing: 2) {
                            RatingView(rating: rating, size: 10)
                        }
                    }

                    if let duration = book.formattedDuration {
                        Text(duration)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
    }

    // MARK: - Helpers

    private func formatSeriesOrder(_ order: Double) -> String {
        if order == floor(order) {
            return "\(Int(order))"
        }
        return String(format: "%.1f", order)
    }
}
