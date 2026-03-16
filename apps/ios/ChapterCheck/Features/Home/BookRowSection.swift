import SwiftUI

/// Reusable horizontal scroll section for books on the home page.
///
/// Displays a section header with a title, followed by a horizontal
/// `ScrollView` of `HomeBookCard` views with lazy loading. Optionally
/// shows a "See All" link that navigates to the given destination.
struct BookRowSection: View {
    let title: String
    let books: [BookWithDetails]
    var seeAllDestination: AppDestination?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: title, seeAllDestination: seeAllDestination)

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
