import SwiftUI

/// Home page section displaying the user's recently listened audiobooks.
///
/// Shows a large hero card for the most recent item, followed by a horizontal
/// scroll of smaller cards for the remaining items. When a book is currently
/// playing, it is promoted to the hero position.
struct ContinueListeningSection: View {
    let items: [RecentListeningProgress]
    @Environment(AudioPlayerManager.self) private var audioPlayer

    /// Items reordered so the currently playing book is first.
    private var orderedItems: [RecentListeningProgress] {
        guard let currentBookId = audioPlayer.currentBook?._id,
              let idx = items.firstIndex(where: { $0.bookId == currentBookId }),
              idx != items.startIndex
        else { return items }
        var reordered = items
        let playing = reordered.remove(at: idx)
        reordered.insert(playing, at: 0)
        return reordered
    }

    private var heroItem: RecentListeningProgress? { orderedItems.first }
    private var remainingItems: [RecentListeningProgress] { Array(orderedItems.dropFirst()) }

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            SectionHeader(title: "Continue Listening")

            if let heroItem {
                HeroListeningCard(item: heroItem)
                    .padding(.horizontal)
            }

            if !remainingItems.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    LazyHStack(spacing: 12) {
                        ForEach(remainingItems) { item in
                            ListeningCard(item: item)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }
}
