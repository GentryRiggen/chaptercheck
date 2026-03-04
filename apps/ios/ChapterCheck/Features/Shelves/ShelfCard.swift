import SwiftUI

/// Card view for displaying a shelf in a grid.
///
/// Shows a stacked cover preview (up to 3 books), the shelf name, book count,
/// and a lock badge when the shelf is private.
struct ShelfCard: View {
    let shelf: Shelf

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            coverStack

            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(shelf.name)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    Spacer(minLength: 0)

                    if !shelf.isPublic {
                        Image(systemName: "lock.fill")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                Text(bookCountLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
    }

    // MARK: - Cover Stack

    private var coverStack: some View {
        ZStack(alignment: .bottomLeading) {
            if shelf.previewBooks.isEmpty {
                emptyPlaceholder
            } else {
                ForEach(Array(shelf.previewBooks.prefix(3).enumerated().reversed()), id: \.offset) { index, book in
                    BookCoverView(r2Key: book.coverImageR2Key, displayMode: .fit(maxWidth: coverSize, maxHeight: coverSize * 1.5))
                        .offset(x: CGFloat(index) * 6, y: CGFloat(index) * -4)
                        .shadow(color: .black.opacity(0.15), radius: 3, x: 0, y: 2)
                }
            }
        }
        .frame(height: coverSize * 1.5 + 8)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var emptyPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
            Image(systemName: "books.vertical.fill")
                .font(.system(size: coverSize * 0.3))
                .foregroundStyle(.secondary)
        }
        .frame(width: coverSize, height: coverSize * 1.5)
    }

    // MARK: - Helpers

    private var coverSize: CGFloat {
        (UIScreen.main.bounds.width / 2) - 48
    }

    private var bookCountLabel: String {
        let count = shelf.bookCountInt
        return "\(count) \(count == 1 ? "book" : "books")"
    }
}
