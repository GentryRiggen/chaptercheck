import SwiftUI

/// Reusable horizontal scroll section for books on the home page.
///
/// Displays a section header with a title, followed by a horizontal
/// `ScrollView` of `HomeBookCard` views with lazy loading.
struct BookRowSection: View {
    let title: String
    let books: [BookWithDetails]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.title3)
                .fontWeight(.semibold)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                LazyHStack(spacing: 12) {
                    ForEach(books) { book in
                        NavigationLink(value: AppDestination.book(id: book._id)) {
                            HomeBookCard(book: book)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal)
            }
        }
    }
}
