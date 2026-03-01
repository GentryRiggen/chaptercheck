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

            Spacer()
                .frame(minHeight: 4, maxHeight: 12)

            // Cover artwork
            coverImage
                .padding(.horizontal, 32)

            Spacer()
                .frame(minHeight: 20, maxHeight: 32)

            // Track info + Seek bar (tightly grouped)
            VStack(spacing: 16) {
                trackInfo
                SeekBarView()
            }
            .padding(.horizontal, 28)

            Spacer()
                .frame(minHeight: 16, maxHeight: 28)

            // Transport controls
            transportControls

            Spacer()
                .frame(minHeight: 16, maxHeight: 32)

            // Bottom controls (speed, parts)
            bottomControls
                .padding(.horizontal, 28)

            Spacer()
                .frame(minHeight: 16, maxHeight: 40)
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
                    .font(.title2.weight(.medium))
                    .foregroundStyle(.primary)
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
            size: 240
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
        HStack(spacing: 44) {
            // Skip backward 15s
            Button {
                Haptics.light()
                audioPlayer.skipBackward()
            } label: {
                Image(systemName: "gobackward.15")
                    .font(.system(size: 28))
                    .foregroundStyle(.primary)
                    .frame(width: 60, height: 60)
            }

            // Play/Pause (large)
            Button {
                Haptics.medium()
                audioPlayer.togglePlayPause()
            } label: {
                ZStack {
                    Circle()
                        .fill(Color.accentColor)
                        .frame(width: 76, height: 76)

                    if audioPlayer.isLoading {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 28))
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
                    .font(.system(size: 28))
                    .foregroundStyle(.primary)
                    .frame(width: 60, height: 60)
            }
        }
    }

    // MARK: - Bottom Controls

    private var bottomControls: some View {
        ZStack {
            SpeedControlView()

            if audioPlayer.audioFiles.count > 1 {
                HStack {
                    Spacer()

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
    }

    // MARK: - Helpers

    private var authorName: String {
        audioPlayer.currentBook?.authors.first?.name ?? "Unknown Author"
    }
}
