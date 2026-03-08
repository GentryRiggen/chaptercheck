import SwiftUI

/// Displays up to 3 book covers stacked with a diagonal offset, matching the shelf card style.
///
/// Falls back to a placeholder icon when no covers are available.
struct StackedCoversView: View {
    let previewBooks: [ShelfPreviewBook]
    let size: CGFloat

    var body: some View {
        ZStack(alignment: .bottomLeading) {
            if previewBooks.isEmpty {
                placeholder
            } else {
                ForEach(Array(previewBooks.prefix(3).enumerated().reversed()), id: \.offset) { index, book in
                    BookCoverView(
                        r2Key: book.coverImageR2Key,
                        displayMode: .fit(maxWidth: size, maxHeight: size * 1.5)
                    )
                    .offset(x: CGFloat(index) * 5, y: CGFloat(index) * -3)
                    .shadow(color: .black.opacity(0.15), radius: 2, x: 0, y: 1)
                }
            }
        }
        .frame(height: size * 1.5 + 6)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var placeholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
            Image(systemName: "books.vertical.fill")
                .font(.system(size: size * 0.3))
                .foregroundStyle(.secondary)
        }
        .frame(width: size, height: size * 1.5)
    }
}
