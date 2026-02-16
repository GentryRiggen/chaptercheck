import SwiftUI

/// A single review row showing user info, rating stars, text, and date.
struct ReviewRow: View {
    let review: PublicReview

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // User info and rating
            HStack(spacing: 8) {
                // User avatar
                userAvatar

                VStack(alignment: .leading, spacing: 2) {
                    Text(review.user?.displayName ?? "Anonymous")
                        .font(.subheadline)
                        .fontWeight(.medium)

                    if let rating = review.rating {
                        RatingView(rating: rating, size: 12)
                    }
                }

                Spacer()

                // Date
                if let reviewedAt = review.reviewedAt {
                    Text(TimeFormatting.formatRelativeDate(reviewedAt))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            // Review text
            if let text = review.reviewText, !text.isEmpty {
                Text(text)
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .lineLimit(4)
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 4)
    }

    // MARK: - Avatar

    @ViewBuilder
    private var userAvatar: some View {
        if let imageUrl = review.user?.imageUrl, let url = URL(string: imageUrl) {
            AsyncImage(url: url) { phase in
                switch phase {
                case .success(let image):
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                default:
                    avatarPlaceholder
                }
            }
            .frame(width: 32, height: 32)
            .clipShape(Circle())
        } else {
            avatarPlaceholder
        }
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(.fill.tertiary)
            .frame(width: 32, height: 32)
            .overlay {
                Image(systemName: "person.fill")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
    }
}
