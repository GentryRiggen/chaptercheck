import SwiftUI

/// Horizontal scroll section for bookshelves on the home page.
///
/// Shows a header with "My Bookshelves", a "See All" link, and a horizontal
/// scroll of shelf cards. Includes a leading "+" card to create a new shelf.
struct ShelfRowSection: View {
    let shelves: [Shelf]

    @State private var isCreateShelfPresented = false

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("My Bookshelves")
                    .font(.title3)
                    .fontWeight(.semibold)

                Spacer()

                NavigationLink(value: AppDestination.browseShelves) {
                    HStack(spacing: 2) {
                        Text("See All")
                            .font(.subheadline)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                    }
                    .foregroundStyle(.secondary)
                }
            }
            .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(alignment: .top, spacing: 12) {
                    createShelfButton

                    ForEach(shelves) { shelf in
                        NavigationLink(value: AppDestination.shelf(id: shelf._id)) {
                            HomeShelfCard(shelf: shelf)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
        .sheet(isPresented: $isCreateShelfPresented) {
            ShelfFormSheet()
        }
    }

    // MARK: - Create Shelf Button

    private var createShelfButton: some View {
        Button {
            isCreateShelfPresented = true
        } label: {
            VStack(spacing: 8) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(.fill.tertiary)
                        .frame(width: cardWidth, height: cardWidth * 1.5)
                    Image(systemName: "plus")
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(.secondary)
                }

                Text("New Bookshelf")
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(.secondary)
            }
            .frame(width: cardWidth)
        }
        .buttonStyle(.plain)
    }

    private var cardWidth: CGFloat { 120 }
}

// MARK: - Home Shelf Card

/// Compact shelf card for horizontal scroll on the home page.
private struct HomeShelfCard: View {
    let shelf: Shelf

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            coverStack

            VStack(alignment: .leading, spacing: 2) {
                HStack(alignment: .firstTextBaseline, spacing: 4) {
                    Text(shelf.name)
                        .font(.caption)
                        .fontWeight(.medium)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if !shelf.isPublic {
                        Image(systemName: "lock.fill")
                            .font(.system(size: 8))
                            .foregroundStyle(.secondary)
                    }
                }

                Text(bookCountLabel)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(width: cardWidth)
    }

    // MARK: - Cover Stack

    private var coverStack: some View {
        ZStack(alignment: .bottomLeading) {
            if shelf.previewBooks.isEmpty {
                emptyPlaceholder
            } else {
                ForEach(Array(shelf.previewBooks.prefix(3).enumerated().reversed()), id: \.offset) { index, book in
                    BookCoverView(r2Key: book.coverImageR2Key, size: coverSize)
                        .offset(x: CGFloat(index) * 5, y: CGFloat(index) * -3)
                        .shadow(color: .black.opacity(0.15), radius: 2, x: 0, y: 1)
                }
            }
        }
        .frame(width: cardWidth, height: cardWidth * 1.5)
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var emptyPlaceholder: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
            Image(systemName: "books.vertical.fill")
                .font(.system(size: cardWidth * 0.2))
                .foregroundStyle(.secondary)
        }
        .frame(width: cardWidth, height: cardWidth * 1.5)
    }

    // MARK: - Helpers

    private var cardWidth: CGFloat { 120 }
    private var coverSize: CGFloat { cardWidth - 12 }

    private var bookCountLabel: String {
        let count = shelf.bookCountInt
        return "\(count) \(count == 1 ? "book" : "books")"
    }
}
