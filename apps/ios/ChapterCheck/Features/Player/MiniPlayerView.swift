import SwiftUI
import UIKit

/// Persistent mini player bar shown above the tab bar when audio is loaded.
///
/// Displays a small cover image, title, author, thin progress bar,
/// and play/pause + skip forward buttons. Tapping the bar (not the buttons)
/// presents the full `NowPlayingView` as a sheet.
struct MiniPlayerView: View {
    @Binding var isNowPlayingPresented: Bool
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        Button {
            isNowPlayingPresented = true
        } label: {
            VStack(spacing: 0) {
                // Progress bar (thin, at the top)
                GeometryReader { geometry in
                    ZStack(alignment: .leading) {
                        Rectangle()
                            .fill(.fill.quaternary)

                        Rectangle()
                            .fill(Color.accentColor)
                            .frame(width: geometry.size.width * audioPlayer.progress)
                    }
                }
                .frame(height: 2)

                // Content
                HStack(spacing: 12) {
                    // Cover image
                    BookCoverView(
                        r2Key: audioPlayer.currentBook?.coverImageR2Key,
                        size: 48
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 6))

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

                    Spacer()

                    // Transport controls
                    HStack(spacing: 12) {
                        Button {
                            Haptics.light()
                            audioPlayer.skipBackward()
                        } label: {
                            Image(systemName: audioPlayer.skipBackwardSymbol)
                                .contentTransition(.symbolEffect(.replace))
                                .font(.system(size: 22))
                                .foregroundStyle(.primary)
                                .frame(width: 36, height: 36)
                        }
                        .buttonStyle(.plain)

                        Button {
                            Haptics.light()
                            audioPlayer.togglePlayPause()
                        } label: {
                            Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                                .font(.system(size: 26))
                                .foregroundStyle(.primary)
                                .frame(width: 36, height: 36)
                        }
                        .buttonStyle(.plain)

                        Button {
                            Haptics.light()
                            audioPlayer.skipForward()
                        } label: {
                            Image(systemName: audioPlayer.skipForwardSymbol)
                                .contentTransition(.symbolEffect(.replace))
                                .font(.system(size: 22))
                                .foregroundStyle(.primary)
                                .frame(width: 36, height: 36)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 10)
            }
            .background(Color(UIColor.systemBackground).opacity(0.625))
            .clipShape(RoundedRectangle(cornerRadius: 14))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private var authorName: String {
        audioPlayer.currentBook?.authors.first?.name ?? "Unknown Author"
    }
}
