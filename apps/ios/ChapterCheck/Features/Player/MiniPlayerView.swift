import SwiftUI
import UIKit

/// Persistent mini player bar floating at the bottom of the screen.
///
/// Uses a capsule (pill) shape with glass material to match the iOS 26
/// liquid glass tab bar style. Displays cover image, centered transport
/// controls, and an expand chevron. Tapping the bar presents the full `NowPlayingView`.
struct MiniPlayerView: View {
    @Binding var isNowPlayingPresented: Bool
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        Button {
            isNowPlayingPresented = true
        } label: {
            HStack(spacing: 0) {
                // Cover image — leading
                BookCoverView(
                    r2Key: audioPlayer.currentBook?.coverImageR2Key,
                    size: 48
                )
                .clipShape(RoundedRectangle(cornerRadius: 8))

                Spacer(minLength: 0)

                // Transport controls — centered
                HStack(spacing: 16) {
                    Button {
                        Haptics.light()
                        audioPlayer.skipBackward()
                    } label: {
                        Image(systemName: audioPlayer.skipBackwardSymbol)
                            .contentTransition(.symbolEffect(.replace))
                            .font(.system(size: 28))
                            .foregroundStyle(.tint)
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)

                    Button {
                        Haptics.light()
                        audioPlayer.togglePlayPause()
                    } label: {
                        Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 34))
                            .foregroundStyle(.tint)
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)

                    Button {
                        Haptics.light()
                        audioPlayer.skipForward()
                    } label: {
                        Image(systemName: audioPlayer.skipForwardSymbol)
                            .contentTransition(.symbolEffect(.replace))
                            .font(.system(size: 28))
                            .foregroundStyle(.tint)
                            .frame(width: 44, height: 44)
                    }
                    .buttonStyle(.plain)
                }

                Spacer(minLength: 0)

                // Expand chevron — trailing (decorative, outer button handles tap)
                Image(systemName: "chevron.up")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.tint)
                    .frame(width: 48, height: 48)
                    .accessibilityHidden(true)
            }
            .padding(.leading, 14)
            .padding(.trailing, 10)
            .padding(.vertical, 8)
            .contentShape(.capsule)
            .glassEffect(.regular.interactive(), in: .capsule)
            .shadow(color: .black.opacity(0.2), radius: 12, x: 0, y: 4)
            .shadow(color: .black.opacity(0.08), radius: 2, x: 0, y: 1)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Now Playing: \(audioPlayer.currentBook?.title ?? "Unknown")")
    }
}
