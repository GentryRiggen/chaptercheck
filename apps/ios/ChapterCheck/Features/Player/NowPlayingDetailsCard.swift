import SwiftUI

/// Scrollable book details card shown as the second page of the Now Playing carousel.
///
/// Displays authors, series, rating, description, metadata, and a review action.
/// Tappable rows call `onNavigate` to dismiss the player and navigate to the destination.
struct NowPlayingDetailsCard: View {
    let book: BookWithDetails
    let viewModel: NowPlayingDetailsViewModel
    let onNavigate: (AppDestination) -> Void
    let onOpenReview: () -> Void

    var body: some View {
        ScrollView(.vertical, showsIndicators: false) {
            VStack(alignment: .leading, spacing: 20) {
                authorsSection
                seriesSection
                ratingSection
                descriptionSection
                metadataRow
                reviewSection
            }
            .padding(.horizontal, 4)
            .padding(.vertical, 8)
        }
    }

    // MARK: - Authors

    @ViewBuilder
    private var authorsSection: some View {
        if !book.authors.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionLabel("Authors")

                ForEach(book.authors) { author in
                    Button {
                        onNavigate(.author(id: author._id))
                    } label: {
                        HStack(spacing: 12) {
                            BookCoverView(r2Key: author.imageR2Key, size: 36)
                                .clipShape(Circle())

                            VStack(alignment: .leading, spacing: 2) {
                                Text(author.name)
                                    .font(.subheadline)
                                    .fontWeight(.medium)

                                if let role = author.role, role.lowercased() != "author" {
                                    Text(role.capitalized)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                            }

                            Spacer()

                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                        .contentShape(Rectangle())
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    // MARK: - Series

    @ViewBuilder
    private var seriesSection: some View {
        if let series = book.series {
            VStack(alignment: .leading, spacing: 8) {
                sectionLabel("Series")

                Button {
                    onNavigate(.series(id: series._id))
                } label: {
                    HStack(spacing: 12) {
                        Image(systemName: "books.vertical")
                            .font(.body)
                            .foregroundStyle(.secondary)
                            .frame(width: 36, height: 36)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(series.name)
                                .font(.subheadline)
                                .fontWeight(.medium)

                            if let order = book.seriesOrder {
                                Text("Book #\(formatSeriesOrder(order))")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                    .contentShape(Rectangle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    // MARK: - Rating

    @ViewBuilder
    private var ratingSection: some View {
        if let stats = viewModel.ratingStats, let avg = stats.averageRating {
            VStack(alignment: .leading, spacing: 8) {
                sectionLabel("Rating")

                HStack(spacing: 8) {
                    RatingView(rating: avg, size: 16)
                    Text("\(String(format: "%.1f", avg))")
                        .font(.subheadline)
                        .fontWeight(.medium)
                    Text("(\(stats.ratingCountInt) \(stats.ratingCountInt == 1 ? "rating" : "ratings"))")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Description

    @ViewBuilder
    private var descriptionSection: some View {
        if let description = book.description, !description.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
                sectionLabel("Description")

                Text(description)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .lineLimit(8)
            }
        }
    }

    // MARK: - Metadata

    @ViewBuilder
    private var metadataRow: some View {
        let hasYear = book.publishedYear != nil
        let hasDuration = book.formattedDuration != nil

        if hasYear || hasDuration {
            HStack(spacing: 16) {
                if let year = book.publishedYear.map({ Int($0) }) {
                    Label("\(year)", systemImage: "calendar")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                if let duration = book.formattedDuration {
                    Label(duration, systemImage: "clock")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Review

    @ViewBuilder
    private var reviewSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            sectionLabel("Your Review")

            if viewModel.isRead {
                if viewModel.hasReview {
                    if let rating = viewModel.userData?.ratingInt {
                        RatingView(rating: Double(rating), size: 14)
                    }
                    if let text = viewModel.userData?.reviewText, !text.isEmpty {
                        Text(text)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(3)
                    }
                }

                Button {
                    onOpenReview()
                } label: {
                    Text(viewModel.hasReview ? "Edit Review" : "Write Review")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(.tint)
                }
                .buttonStyle(.plain)
            } else {
                Text("Mark as read to leave a review")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    // MARK: - Helpers

    private func sectionLabel(_ title: String) -> some View {
        Text(title)
            .font(.caption)
            .fontWeight(.semibold)
            .foregroundStyle(.secondary)
            .textCase(.uppercase)
    }

    private func formatSeriesOrder(_ order: Double) -> String {
        if order == floor(order) {
            return "\(Int(order))"
        }
        return String(format: "%.1f", order)
    }
}
