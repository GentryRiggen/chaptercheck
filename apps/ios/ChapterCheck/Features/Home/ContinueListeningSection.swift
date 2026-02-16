import SwiftUI

/// Home page section displaying the user's recently listened audiobooks.
///
/// Shows a large hero card for the most recent item, followed by a horizontal
/// scroll of smaller cards for the remaining items.
struct ContinueListeningSection: View {
    let items: [RecentListeningProgress]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Continue Listening")
                .font(.title3)
                .fontWeight(.semibold)
                .padding(.horizontal)

            if let heroItem = items.first {
                HeroListeningCard(item: heroItem)
                    .padding(.horizontal)
            }

            if items.count > 1 {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 12) {
                        ForEach(items.dropFirst()) { item in
                            ListeningCard(item: item)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}
