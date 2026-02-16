import SwiftUI

/// Vertical list of public reviews for a book.
///
/// Shows up to 5 reviews by default with a "See all" disclosure if more exist.
struct ReviewsListView: View {
    let reviews: [PublicReview]

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
            HStack {
                Text("Reviews")
                    .font(.headline)

                Spacer()

                Text("\(reviews.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.horizontal)

            ForEach(displayedReviews) { review in
                ReviewRow(review: review)
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
}
