import SwiftUI

/// Vertical list of public reviews for a book.
///
/// Shows up to 5 reviews by default with a "See all" disclosure if more exist.
/// The user's own review (if present) is always shown first (pinned by the ViewModel).
/// Includes a sort picker in the header and a write/edit review button.
struct ReviewsListView: View {
    let reviews: [PublicReview]
    @Binding var sortOption: ReviewSortOption
    let userHasReview: Bool
    let isOwnReviewPrivate: Bool
    let onWriteReview: () -> Void

    private static let previewLimit = 5

    @State private var isShowingAll = false

    private var displayedReviews: [PublicReview] {
        if isShowingAll {
            return reviews
        }
        return Array(reviews.prefix(Self.previewLimit))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            headerRow
            writeReviewButton
            ForEach(displayedReviews) { review in
                reviewRow(review)
            }

            if reviews.count > Self.previewLimit && !isShowingAll {
                Button {
                    withAnimation {
                        isShowingAll = true
                    }
                } label: {
                    Text("See all \(reviews.count) reviews")
                        .font(.subheadline)
                        .foregroundStyle(.tint)
                }
                .padding(.horizontal)
            }
        }
    }

    // MARK: - Header

    private var headerRow: some View {
        HStack {
            Text("Reviews")
                .font(.headline)

            if reviews.count > 0 {
                Text("\(reviews.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Menu {
                Picker("Sort", selection: $sortOption) {
                    ForEach(ReviewSortOption.allCases) { option in
                        Text(option.label).tag(option)
                    }
                }
            } label: {
                Label("Sort", systemImage: "arrow.up.arrow.down")
                    .font(.subheadline)
                    .foregroundStyle(.tint)
                    .labelStyle(.iconOnly)
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Write Review Button

    @ViewBuilder
    private var writeReviewButton: some View {
        Button {
            Haptics.medium()
            onWriteReview()
        } label: {
            Label(
                userHasReview ? "Edit Your Review" : "Write a Review",
                systemImage: userHasReview ? "pencil" : "square.and.pencil"
            )
            .font(.subheadline)
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(.vertical, 4)
        }
        .buttonStyle(.bordered)
        .padding(.horizontal)
    }

    // MARK: - Individual Review Row

    @ViewBuilder
    private func reviewRow(_ review: PublicReview) -> some View {
        VStack(alignment: .leading, spacing: 0) {
            ReviewRow(review: review)

            // Private indicator for the user's own private review
            if review.isOwnReview == true && isOwnReviewPrivate {
                HStack(spacing: 4) {
                    Image(systemName: "eye.slash")
                        .font(.caption2)
                    Text("Only visible to you")
                        .font(.caption2)
                }
                .foregroundStyle(.secondary)
                .padding(.horizontal)
                .padding(.bottom, 4)
            }
        }
    }
}
