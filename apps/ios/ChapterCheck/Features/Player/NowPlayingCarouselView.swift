import SwiftUI

/// Swipeable carousel for the Now Playing screen.
///
/// Page 0 shows the cover artwork with play/pause scale animation.
/// Page 1 shows a scrollable details card with authors, series, rating, etc.
struct NowPlayingCarouselView: View {
    let book: BookWithDetails?
    let isPlaying: Bool
    let artworkSize: CGFloat
    let viewModel: NowPlayingDetailsViewModel
    @Binding var selectedPage: Int
    let onNavigate: (AppDestination) -> Void
    let onOpenReview: () -> Void

    var body: some View {
        TabView(selection: $selectedPage) {
            // Page 0: Cover artwork
            coverPage
                .tag(0)

            // Page 1: Details card (only when book is loaded)
            if let book {
                NowPlayingDetailsCard(
                    book: book,
                    viewModel: viewModel,
                    onNavigate: onNavigate,
                    onOpenReview: onOpenReview
                )
                .padding(.horizontal, 20)
                .tag(1)
            }
        }
        .tabViewStyle(.page(indexDisplayMode: .never))
    }

    // MARK: - Cover Page

    private var coverPage: some View {
        VStack {
            Spacer()
            BookCoverView(
                r2Key: book?.coverImageR2Key,
                displayMode: .fit(maxWidth: artworkSize, maxHeight: artworkSize)
            )
            .scaleEffect(isPlaying ? 1.0 : 0.85)
            Spacer()
        }
    }
}
