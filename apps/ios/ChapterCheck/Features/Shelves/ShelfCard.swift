import SwiftUI

/// Card view for displaying a shelf in a grid.
///
/// Shows a stacked cover preview (up to 3 books), the shelf name, book count,
/// and a lock badge when the shelf is private.
struct ShelfCard: View {
    let shelf: Shelf

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            StackedCoversView(previewBooks: shelf.previewBooks, size: coverSize)

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

    // MARK: - Helpers

    private var coverSize: CGFloat {
        (UIScreen.main.bounds.width / 2) - 48
    }

    private var bookCountLabel: String {
        let count = shelf.bookCountInt
        return "\(count) \(count == 1 ? "book" : "books")"
    }
}
