import SwiftUI

/// Configurable empty state placeholder with an SF Symbol icon, title, and subtitle.
///
/// Used when a list or section has no data to display (e.g., no books, no reviews).
struct EmptyStateView: View {
    let icon: String
    let title: String
    var subtitle: String?

    var body: some View {
        ContentUnavailableView {
            Label(title, systemImage: icon)
        } description: {
            if let subtitle {
                Text(subtitle)
            }
        }
    }
}

#Preview {
    EmptyStateView(
        icon: "books.vertical",
        title: "No Books Yet",
        subtitle: "Your library is empty. Add some books to get started."
    )
}
