import SwiftUI

/// Metadata section for a book detail screen.
///
/// Shows tappable author names (navigate to AuthorDetailView), series link
/// (navigate to SeriesDetailView), published year, rating, and duration.
struct BookMetadataView: View {
    let book: BookWithDetails
    var ratingStats: RatingStats?

    var body: some View {
        VStack(spacing: 8) {
            // Authors
            authorRow

            // Series
            if let series = book.series {
                seriesRow(series)
            }

            // Stats row: year, rating, duration
            HStack(spacing: 16) {
                if let year = book.publishedYear.map({ Int($0) }) {
                    metadataItem(icon: "calendar", text: "\(year)")
                }

                if let stats = ratingStats, let avg = stats.averageRating {
                    HStack(spacing: 4) {
                        RatingView(rating: avg, size: 12)
                        Text("(\(stats.ratingCountInt))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                if let duration = book.formattedDuration {
                    metadataItem(icon: "clock", text: duration)
                }
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Authors

    private var authorRow: some View {
        VStack(spacing: 8) {
            ForEach(book.authors) { author in
                NavigationLink(value: AppDestination.author(id: author._id)) {
                    HStack(spacing: 12) {
                        Image(systemName: "person.fill")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                            .frame(width: 28, height: 28)
                            .background(Color.white.opacity(0.06), in: Circle())

                        VStack(alignment: .leading, spacing: 2) {
                            Text(author.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(.primary)

                            if let role = author.role, !role.isEmpty {
                                Text(role.capitalized)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.tertiary)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 10)
                    .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .contentShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Series

    private func seriesRow(_ series: SeriesSummary) -> some View {
        NavigationLink(value: AppDestination.series(id: series._id)) {
            HStack(spacing: 4) {
                Image(systemName: "books.vertical")
                    .font(.caption)

                Text(series.name)
                    .font(.subheadline)

                if let order = book.seriesOrder {
                    Text("#\(formatSeriesOrder(order))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer(minLength: 8)

                Image(systemName: "chevron.right")
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.tertiary)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(Color.white.opacity(0.04), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private func metadataItem(icon: String, text: String) -> some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(.secondary)
            Text(text)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
    }

    private func formatSeriesOrder(_ order: Double) -> String {
        if order == floor(order) {
            return "\(Int(order))"
        }
        return String(format: "%.1f", order)
    }
}
