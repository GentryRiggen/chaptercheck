import SwiftUI

/// A single audio file row within the audio files list.
///
/// Shows the part number, display name, duration, file size, download status, and a play button.
/// Highlights the currently playing part and shows resume position if applicable.
struct AudioFileRow: View {
    let audioFile: AudioFile
    let isCurrentPart: Bool
    let savedPosition: Double?
    let book: BookWithDetails
    let allFiles: [AudioFile]

    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(\.showNowPlaying) private var showNowPlaying

    /// Whether the audio player is currently playing this specific file.
    private var isNowPlaying: Bool {
        audioPlayer.currentAudioFile?._id == audioFile._id
    }

    private var fileStatus: DownloadStatus? {
        downloadManager.fileStatuses[audioFile._id]
    }

    private var fileProgress: Double {
        downloadManager.fileProgress[audioFile._id] ?? 0
    }

    var body: some View {
        Button {
            handlePlay()
        } label: {
            HStack(spacing: 12) {
                // Part number badge
                ZStack {
                    Circle()
                        .fill(isNowPlaying ? AnyShapeStyle(.tint) : AnyShapeStyle(Color(.systemFill)))
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

                    HStack(spacing: 4) {
                        Text(audioFile.formattedDuration)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text("·")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        Text(audioFile.formattedFileSize)
                            .font(.caption)
                            .foregroundStyle(.secondary)

                        if let savedPosition, savedPosition > 0 {
                            Text("· Resume from \(TimeFormatting.formatTime(savedPosition))")
                                .font(.caption)
                                .foregroundStyle(.tint)
                        }
                    }
                }

                Spacer()

                // Download status indicator
                downloadIndicator

                // Play icon
                Image(systemName: isNowPlaying && audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                    .font(.body)
                    .foregroundStyle(.tint)
            }
            .padding(.horizontal)
            .padding(.vertical, 8)
            .background(isNowPlaying ? AnyShapeStyle(.tint.opacity(0.08)) : AnyShapeStyle(.clear))
        }
        .buttonStyle(.plain)
    }

    // MARK: - Download Indicator

    @ViewBuilder
    private var downloadIndicator: some View {
        switch fileStatus {
        case .completed:
            Image(systemName: "checkmark.circle.fill")
                .font(.body)
                .foregroundStyle(.green)

        case .downloading:
            ZStack {
                Circle()
                    .stroke(.secondary.opacity(0.3), lineWidth: 2.5)
                Circle()
                    .trim(from: 0, to: fileProgress)
                    .stroke(.tint, style: StrokeStyle(lineWidth: 2.5, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .frame(width: 22, height: 22)

        case .failed:
            Button {
                Haptics.light()
                downloadManager.downloadAudioFile(audioFile: audioFile, book: book, allFiles: allFiles)
            } label: {
                Image(systemName: "exclamationmark.triangle")
                    .font(.body)
                    .foregroundStyle(.orange)
            }
            .buttonStyle(.plain)

        case .pending:
            ProgressView()
                .controlSize(.small)

        case nil:
            Button {
                Haptics.light()
                downloadManager.downloadAudioFile(audioFile: audioFile, book: book, allFiles: allFiles)
            } label: {
                Image(systemName: "arrow.down.circle")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
            .buttonStyle(.plain)
        }
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
            showNowPlaying()
        }
    }
}
