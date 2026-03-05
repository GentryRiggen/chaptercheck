import SwiftUI

/// Reusable 2-column grid of shelf cards.
///
/// Used on user profile pages and anywhere a collection of shelves is displayed.
struct ShelfListView: View {
    let shelves: [Shelf]

    private let columns = [
        GridItem(.flexible(), spacing: 12),
        GridItem(.flexible(), spacing: 12),
    ]

    var body: some View {
        ScrollView {
            LazyVGrid(columns: columns, spacing: 16) {
                ForEach(shelves) { shelf in
                    NavigationLink(value: AppDestination.shelf(id: shelf._id)) {
                        ShelfCard(shelf: shelf)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
            .padding(.top, 8)

            Spacer()
                .frame(height: 80)
        }
    }
}
