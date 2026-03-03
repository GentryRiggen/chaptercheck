import SwiftUI
import UIKit

/// Persistent mini player bar floating at the bottom of the screen.
///
/// Uses a capsule (pill) shape with glass material to match the iOS 26
/// liquid glass tab bar style. Displays cover image, title, author,
/// and transport controls. Tapping the bar presents the full `NowPlayingView`.
struct MiniPlayerView: View {
    @Binding var isNowPlayingPresented: Bool
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        Button {
            isNowPlayingPresented = true
        } label: {
            HStack(spacing: 10) {
                // Cover image
                BookCoverView(
                    r2Key: audioPlayer.currentBook?.coverImageR2Key,
                    size: 44
                )
                .clipShape(RoundedRectangle(cornerRadius: 8))

                // Title and author
                VStack(alignment: .leading, spacing: 2) {
                    Text(audioPlayer.currentBook?.title ?? "Unknown")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .lineLimit(1)

                    Text(authorName)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                Spacer(minLength: 4)

                // Transport controls
                HStack(spacing: 8) {
                    Button {
                        Haptics.light()
                        audioPlayer.skipBackward()
                    } label: {
                        Image(systemName: audioPlayer.skipBackwardSymbol)
                            .contentTransition(.symbolEffect(.replace))
                            .font(.system(size: 20))
                            .foregroundStyle(.primary)
                            .frame(width: 34, height: 34)
                    }
                    .buttonStyle(.plain)

                    Button {
                        Haptics.light()
                        audioPlayer.togglePlayPause()
                    } label: {
                        Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(.primary)
                            .frame(width: 34, height: 34)
                    }
                    .buttonStyle(.plain)

                    Button {
                        Haptics.light()
                        audioPlayer.skipForward()
                    } label: {
                        Image(systemName: audioPlayer.skipForwardSymbol)
                            .contentTransition(.symbolEffect(.replace))
                            .font(.system(size: 20))
                            .foregroundStyle(.primary)
                            .frame(width: 34, height: 34)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.leading, 8)
            .padding(.trailing, 12)
            .padding(.vertical, 6)
            .glassEffect(.regular.interactive(), in: .capsule)
            .shadow(color: .black.opacity(0.2), radius: 12, x: 0, y: 4)
            .shadow(color: .black.opacity(0.08), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private var authorName: String {
        audioPlayer.currentBook?.authors.first?.name ?? "Unknown Author"
    }
}
