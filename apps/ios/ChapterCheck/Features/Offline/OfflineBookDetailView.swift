import SwiftUI

/// Minimal book detail view for offline playback.
///
/// Shows cover, title, authors, a play button, and the audio file list.
/// Uses `DownloadManager.offlinePlaybackData(for:)` to reconstruct playback data
/// from the download manifest without requiring a network connection.
/// Resumes from cached listening progress when available.
struct OfflineBookDetailView: View {
    let bookId: String

    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @State private var cachedProgress: CachedListeningProgress?

    private var playbackData: (book: BookWithDetails, files: [AudioFile])? {
        downloadManager.offlinePlaybackData(for: bookId)
    }

    private var isPlayingThisBook: Bool {
        audioPlayer.currentBook?._id == bookId
    }

    var body: some View {
        Group {
            if let data = playbackData {
                content(book: data.book, files: data.files)
            } else {
                ContentUnavailableView(
                    "Book Unavailable",
                    systemImage: "book.closed",
                    description: Text("This book's download data could not be found.")
                )
            }
        }
        .navigationTitle(playbackData?.book.title ?? "Offline Book")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            cachedProgress = await downloadManager.cachedProgress(for: bookId)
        }
    }

    // MARK: - Resume Helpers

    /// The audio file to resume from, based on cached progress.
    private func resumeAudioFile(from files: [AudioFile]) -> AudioFile? {
        guard let cachedProgress else { return files.first }
        return files.first(where: { $0._id == cachedProgress.audioFileId }) ?? files.first
    }

    /// Position in seconds to resume from, with smart rewind applied.
    private func resumePosition(smartRewindEnabled: Bool) -> Double {
        guard let cachedProgress else { return 0 }
        return AudioPlayerManager.smartRewindPosition(
            from: cachedProgress.positionSeconds,
            lastListenedAt: cachedProgress.timestamp,
            enabled: smartRewindEnabled
        )
    }

    /// Playback rate from cached progress.
    private var resumeRate: Double {
        cachedProgress?.playbackRate ?? 1.0
    }

    private var hasExistingProgress: Bool {
        cachedProgress != nil && resumePosition(smartRewindEnabled: audioPlayer.isSmartRewindEnabled) > 0
    }

    // MARK: - Content

    private func content(book: BookWithDetails, files: [AudioFile]) -> some View {
        List {
            // Header
            Section {
                VStack(spacing: 12) {
                    BookCoverView(r2Key: book.coverImageR2Key, size: 160)

                    Text(book.title)
                        .font(.title3)
                        .fontWeight(.semibold)
                        .multilineTextAlignment(.center)

                    if !book.authors.isEmpty {
                        Text(book.authors.map(\.name).joined(separator: ", "))
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }

                    playButton(book: book, files: files)
                        .padding(.top, 4)
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
            }

            // Audio files
            Section {
                ForEach(files) { file in
                    fileRow(file: file, book: book, allFiles: files)
                }
            } header: {
                Text("Audio Files")
            }
        }
    }

    // MARK: - Play Button

    private func playButton(book: BookWithDetails, files: [AudioFile]) -> some View {
        Button {
            guard let audioFile = resumeAudioFile(from: files) else { return }
            Haptics.medium()

            if isPlayingThisBook {
                audioPlayer.togglePlayPause()
            } else {
                audioPlayer.play(
                    book: book,
                    audioFile: audioFile,
                    allFiles: files,
                    startPosition: resumePosition(smartRewindEnabled: audioPlayer.isSmartRewindEnabled),
                    rate: resumeRate
                )
            }
        } label: {
            Label(
                isPlayingThisBook && audioPlayer.isPlaying
                    ? "Pause"
                    : (hasExistingProgress ? "Resume" : "Play"),
                systemImage: isPlayingThisBook && audioPlayer.isPlaying ? "pause.fill" : "play.fill"
            )
            .font(.headline)
            .frame(maxWidth: .infinity)
        }
        .buttonStyle(.borderedProminent)
        .controlSize(.large)
    }

    // MARK: - File Row

    private func fileRow(file: AudioFile, book: BookWithDetails, allFiles: [AudioFile]) -> some View {
        let isNowPlaying = audioPlayer.currentAudioFile?._id == file._id
        let isInProgressFile = cachedProgress?.audioFileId == file._id

        return Button {
            if isNowPlaying {
                audioPlayer.togglePlayPause()
            } else {
                let startPos: Double
                if isInProgressFile {
                    startPos = resumePosition(smartRewindEnabled: audioPlayer.isSmartRewindEnabled)
                } else {
                    startPos = 0
                }
                audioPlayer.play(
                    book: book,
                    audioFile: file,
                    allFiles: allFiles,
                    startPosition: startPos,
                    rate: resumeRate
                )
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: isNowPlaying && audioPlayer.isPlaying ? "speaker.wave.2.fill" : "play.circle")
                    .font(.title3)
                    .foregroundStyle(isNowPlaying ? AnyShapeStyle(.tint) : AnyShapeStyle(.secondary))
                    .frame(width: 28)

                VStack(alignment: .leading, spacing: 2) {
                    Text(file.displayName ?? file.fileName)
                        .font(.subheadline)
                        .fontWeight(isNowPlaying ? .semibold : .regular)
                        .lineLimit(1)

                    HStack(spacing: 4) {
                        Text(file.formattedDuration)

                        if isInProgressFile, let progress = cachedProgress {
                            Text("·")
                            Text(AudioPlayerManager.formatTime(progress.positionSeconds))
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()
            }
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
    }

}
