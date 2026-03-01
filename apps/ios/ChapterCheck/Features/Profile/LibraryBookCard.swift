import SwiftUI

/// A compact card showing a book from a user's reading history.
///
/// Displays the cover, title, primary author, read date, and the user's
/// star rating. Tapping navigates to the full book detail screen.
struct LibraryBookCard: View {
    let book: UserReadBook

    private let coverSize: CGFloat = 60

    var body: some View {
        NavigationLink(value: AppDestination.book(id: book._id)) {
            HStack(spacing: 12) {
                BookCoverView(r2Key: book.coverImageR2Key, size: coverSize)

                VStack(alignment: .leading, spacing: 3) {
                    Text(book.title)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(2)
                        .foregroundStyle(.primary)

                    if let authorName = book.primaryAuthorName {
                        Text(authorName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    if let readAt = book.readAt {
                        Text(TimeFormatting.formatRelativeDate(readAt))
                            .font(.caption2)
                            .foregroundStyle(.tertiary)
                    }

                    if let rating = book.userRating {
                        RatingView(rating: rating)
                            .padding(.top, 2)
                    }
                }

                Spacer(minLength: 0)

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(.plain)
    }
}
