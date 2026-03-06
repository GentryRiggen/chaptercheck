import SwiftUI
import UIKit

/// Persistent mini player bar floating at the bottom of the screen.
///
/// Uses a capsule (pill) shape with glass material to match the iOS 26
/// liquid glass tab bar style. Displays expand chevron, centered transport
/// controls, and cover image. Tapping the bar presents the full `NowPlayingView`.
struct MiniPlayerView: View {
    @Binding var isNowPlayingPresented: Bool
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        Button {
            isNowPlayingPresented = true
        } label: {
            HStack(spacing: 0) {
                // Expand chevron — leading (decorative, outer button handles tap)
                Image(systemName: "chevron.up")
                    .font(.system(size: 20, weight: .semibold))
                    .foregroundStyle(.tint)
                    .frame(width: 48, height: 48)
                    .accessibilityHidden(true)

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

                // Cover image — trailing
                BookCoverView(
                    r2Key: audioPlayer.currentBook?.coverImageR2Key,
                    size: 48
                )
                .clipShape(RoundedRectangle(cornerRadius: 8))
            }
            .padding(.leading, 10)
            .padding(.trailing, 14)
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
