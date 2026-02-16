import SwiftUI

/// Compact card (140pt wide) for horizontal book rows on the home page.
///
/// Shows the book cover image, title (2 lines max), and primary author name.
struct HomeBookCard: View {
    let book: BookWithDetails

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            BookCoverView(r2Key: book.coverImageR2Key, size: 90)

            Text(book.title)
                .font(.caption)
                .fontWeight(.medium)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
                .frame(height: 32, alignment: .top)

            if let authorName = book.authors.first?.name {
                Text(authorName)
                    .font(.caption2)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
        .frame(width: 140)
    }
}

#Preview {
    HomeBookCard(
        book: BookWithDetails(
            _id: "1",
            _creationTime: 0,
            title: "The Way of Kings",
            subtitle: nil,
            description: nil,
            isbn: nil,
            publishedYear: 2010,
            coverImageR2Key: nil,
            language: "en",
            duration: 190_800,
            seriesId: nil,
            seriesOrder: 1,
            averageRating: 2.8,
            ratingCount: 15,
            createdAt: 0,
            updatedAt: 0,
            authors: [
                BookAuthor(
                    _id: "a1",
                    _creationTime: 0,
                    name: "Brandon Sanderson",
                    bio: nil,
                    imageR2Key: nil,
                    role: "Author",
                    createdAt: 0,
                    updatedAt: 0
                ),
            ],
            series: SeriesSummary(_id: "s1", name: "The Stormlight Archive")
        )
    )
    .padding()
}
