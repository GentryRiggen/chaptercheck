import SwiftUI

/// Card view for the 2-column library grid.
///
/// Displays the book cover, title, author names, and rating stars.
struct BookGridCard: View {
    let book: BookWithDetails

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            BookCoverView(r2Key: book.coverImageR2Key, size: cardCoverSize)
                .frame(maxWidth: .infinity)

            Text(book.title)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(2)
                .multilineTextAlignment(.leading)

            if let authorName = primaryAuthorName {
                Text(authorName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            if let rating = book.averageRating, book.ratingCountInt > 0 {
                HStack(spacing: 4) {
                    RatingView(rating: rating, size: 10)
                    Text("(\(book.ratingCountInt))")
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Helpers

    private var primaryAuthorName: String? {
        let authors = book.authors.filter { $0.role?.lowercased() != "narrator" }
        let name = authors.first?.name ?? book.authors.first?.name
        return name
    }

    /// Cover image width scales to fill half the grid minus padding.
    private var cardCoverSize: CGFloat {
        // Approximate: screen width / 2 - padding
        (UIScreen.main.bounds.width / 2) - 36
    }
}
