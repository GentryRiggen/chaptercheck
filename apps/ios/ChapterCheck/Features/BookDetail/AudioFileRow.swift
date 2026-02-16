import SwiftUI

/// A single audio file row within the audio files list.
///
/// Shows the part number, display name, duration, and a play button.
/// Highlights the currently playing part and shows resume position if applicable.
struct AudioFileRow: View {
    let audioFile: AudioFile
    let isCurrentPart: Bool
    let savedPosition: Double?
    let book: BookWithDetails
    let allFiles: [AudioFile]

    @Environment(AudioPlayerManager.self) private var audioPlayer

    /// Whether the audio player is currently playing this specific file.
    private var isNowPlaying: Bool {
        audioPlayer.currentAudioFile?._id == audioFile._id
    }

    var body: some View {
        Button {
            handlePlay()
        } label: {
            HStack(spacing: 12) {
                // Part number badge
                ZStack {
                    Circle()
                        .fill(isNowPlaying ? Color.accentColor : Color(.systemFill))
                        .frame(width: 36, height: 36)

                    if isNowPlaying && audioPlayer.isPlaying {
                        Image(systemName: "waveform")
                            .font(.caption)
                            .foregroundStyle(isNowPlaying ? .white : .primary)
                            .symbolEffect(.variableColor.iterative)
                    } else {
                        Text("\(audioFile.partNumberInt)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(isNowPlaying ? .white : .primary)
                    }
                }

                // File info
                VStack(alignment: .leading, spacing: 2) {
                    Text(displayName)
                        .font(.subheadline)
                        .fontWeight(isCurrentPart ? .semibold : .regular)
                        .lineLimit(1)

                    HStack(spacing: 8) {
                        Text(audioFile.formattedDuration)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if let savedPosition, savedPosition > 0 {
                            Text("Resume from \(TimeFormatting.formatTime(savedPosition))")
                                .font(.caption)
                                .foregroundStyle(.tint)
                        }
                    }
                }

                Spacer()

                // Play icon
                Image(systemName: isNowPlaying && audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                    .font(.body)
                    .foregroundStyle(.tint)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(isNowPlaying ? Color.accentColor.opacity(0.08) : .clear)
        }
        .buttonStyle(.plain)
    }

    // MARK: - Helpers

    private var displayName: String {
        audioFile.displayName ?? audioFile.friendlyName ?? audioFile.fileName
    }

    private func handlePlay() {
        Haptics.light()

        if isNowPlaying {
            audioPlayer.togglePlayPause()
        } else {
            let startPosition = savedPosition ?? 0
            audioPlayer.play(
                book: book,
                audioFile: audioFile,
                allFiles: allFiles,
                startPosition: startPosition,
                rate: audioPlayer.playbackRate
            )
        }
    }
}
