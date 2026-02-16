import SwiftUI

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
                        size: 30
                    )
                    .frame(width: 44, height: 44)
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
                    HStack(spacing: 16) {
                        Button {
                            Haptics.light()
                            audioPlayer.togglePlayPause()
                        } label: {
                            Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                                .font(.title3)
                                .foregroundStyle(.primary)
                                .frame(width: 32, height: 32)
                        }
                        .buttonStyle(.plain)

                        Button {
                            Haptics.light()
                            audioPlayer.skipForward()
                        } label: {
                            Image(systemName: "goforward.30")
                                .font(.body)
                                .foregroundStyle(.primary)
                                .frame(width: 32, height: 32)
                        }
                        .buttonStyle(.plain)
                    }
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
            }
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.1), radius: 4, y: 2)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private var authorName: String {
        audioPlayer.currentBook?.authors.first?.name ?? "Unknown Author"
    }
}
