import SwiftUI

/// Full-screen now playing sheet with large artwork and transport controls.
///
/// Presented as a sheet from the mini player. Includes:
/// - Large cover image
/// - Title, author, part info
/// - Seek bar with time labels
/// - Transport controls (skip back 15s, play/pause, skip forward 30s)
/// - Speed control and part selector
struct NowPlayingView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(\.dismiss) private var dismiss

    @State private var isPartSelectorPresented = false

    var body: some View {
        VStack(spacing: 0) {
            // Dismiss handle
            dismissHandle

            ScrollView(showsIndicators: false) {
                VStack(spacing: 24) {
                    Spacer()
                        .frame(height: 16)

                    // Cover artwork
                    coverImage

                    // Track info
                    trackInfo

                    // Seek bar
                    SeekBarView()

                    // Transport controls
                    transportControls

                    // Bottom controls (speed, parts)
                    bottomControls

                    Spacer()
                        .frame(height: 40)
                }
                .padding(.horizontal, 24)
            }
        }
        .background(.background)
        .sheet(isPresented: $isPartSelectorPresented) {
            PartSelectorView()
                .environment(audioPlayer)
                .presentationDetents([.medium, .large])
        }
    }

    // MARK: - Dismiss Handle

    private var dismissHandle: some View {
        HStack {
            Button {
                dismiss()
            } label: {
                Image(systemName: "chevron.down")
                    .font(.title3)
                    .foregroundStyle(.secondary)
                    .frame(width: 44, height: 44)
            }

            Spacer()

            if let partInfo = audioPlayer.partInfo {
                Text("Part \(partInfo.current) of \(partInfo.total)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Invisible spacer to balance layout
            Color.clear
                .frame(width: 44, height: 44)
        }
        .padding(.horizontal, 12)
    }

    // MARK: - Cover

    private var coverImage: some View {
        BookCoverView(
            r2Key: audioPlayer.currentBook?.coverImageR2Key,
            size: 280
        )
        .shadow(color: .black.opacity(0.2), radius: 16, y: 8)
        .frame(maxWidth: .infinity)
    }

    // MARK: - Track Info

    private var trackInfo: some View {
        VStack(spacing: 4) {
            Text(audioPlayer.currentBook?.title ?? "Unknown")
                .font(.title3)
                .fontWeight(.bold)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            Text(authorName)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(1)

            if let displayName = audioPlayer.currentAudioFile?.displayName,
               audioPlayer.audioFiles.count > 1 {
                Text(displayName)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }
        }
    }

    // MARK: - Transport Controls

    private var transportControls: some View {
        HStack(spacing: 40) {
            // Skip backward 15s
            Button {
                Haptics.light()
                audioPlayer.skipBackward()
            } label: {
                Image(systemName: "gobackward.15")
                    .font(.title)
                    .foregroundStyle(.primary)
                    .frame(width: 56, height: 56)
            }

            // Play/Pause (large)
            Button {
                Haptics.medium()
                audioPlayer.togglePlayPause()
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.accentColor)
                        .frame(width: 72, height: 72)

                    if audioPlayer.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                            .font(.title)
                            .foregroundStyle(.white)
                            // Offset play icon slightly right for visual centering
                            .offset(x: audioPlayer.isPlaying ? 0 : 2)
                    }
                }
            }

            // Skip forward 30s
            Button {
                Haptics.light()
                audioPlayer.skipForward()
            } label: {
                Image(systemName: "goforward.30")
                    .font(.title)
                    .foregroundStyle(.primary)
                    .frame(width: 56, height: 56)
            }
        }
    }

    // MARK: - Bottom Controls

    private var bottomControls: some View {
        HStack {
            SpeedControlView()

            Spacer()

            if audioPlayer.audioFiles.count > 1 {
                Button {
                    isPartSelectorPresented = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "list.bullet")
                        Text("Parts")
                            .font(.subheadline)
                    }
                    .foregroundStyle(.secondary)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(.fill.quaternary)
                    .clipShape(Capsule())
                }
            }
        }
    }

    // MARK: - Helpers

    private var authorName: String {
        audioPlayer.currentBook?.authors.first?.name ?? "Unknown Author"
    }
}
