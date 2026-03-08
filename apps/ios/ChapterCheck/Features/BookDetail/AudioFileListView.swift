import SwiftUI

/// Vertical list of audio file parts for a book.
///
/// Each row shows the part number, display name, duration, file size, download status,
/// and a play button. The header includes a "Download All" action.
struct AudioFileListView: View {
    let audioFiles: [AudioFile]
    let progress: ListeningProgress?
    let book: BookWithDetails
    let canUploadAudio: Bool
    let canShowUploadControls: Bool
    let onUploadRequested: () -> Void

    @Environment(DownloadManager.self) private var downloadManager

    private var allDownloaded: Bool {
        audioFiles.allSatisfy { downloadManager.fileStatuses[$0._id] == .completed }
    }

    private var isBookDownloading: Bool {
        downloadManager.isBookDownloading(book._id)
    }

    private var bookProgress: Double {
        downloadManager.bookProgress(book._id, audioFileIds: audioFiles.map(\._id))
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            header
                .padding(.horizontal)

            if canShowUploadControls && !canUploadAudio {
                Text("Uploading requires premium and editor access.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .padding(.horizontal)
            }

            if audioFiles.isEmpty {
                emptyState
                    .padding(.horizontal)
            } else {
                ForEach(audioFiles) { file in
                    AudioFileRow(
                        audioFile: file,
                        isCurrentPart: progress?.audioFileId == file._id,
                        savedPosition: progress?.audioFileId == file._id ? progress?.positionSeconds : nil,
                        book: book,
                        allFiles: audioFiles
                    )
                }
            }
        }
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text("Audio Files")
                    .font(.headline)

                Text(audioFiles.isEmpty ? "Upload audiobook parts for this book." : "\(audioFiles.count) part\(audioFiles.count == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            HStack(spacing: 8) {
                if canShowUploadControls {
                    Button {
                        Haptics.medium()
                        onUploadRequested()
                    } label: {
                        Label("Upload", systemImage: canUploadAudio ? "plus.circle.fill" : "lock.circle")
                            .labelStyle(.titleAndIcon)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(canUploadAudio ? Color.accentColor : .gray)
                    .disabled(!canUploadAudio)
                }

                downloadAllView
            }
        }
    }

    @ViewBuilder
    private var downloadAllView: some View {
        if audioFiles.isEmpty {
            EmptyView()
        } else if allDownloaded {
            HStack(spacing: 4) {
                Image(systemName: "checkmark.circle.fill")
                    .foregroundStyle(.green)
                    .font(.caption)

                Text("All Downloaded")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        } else if isBookDownloading {
            HStack(spacing: 6) {
                ZStack {
                    Circle()
                        .stroke(.secondary.opacity(0.3), lineWidth: 2)
                    Circle()
                        .trim(from: 0, to: bookProgress)
                        .stroke(.tint, style: StrokeStyle(lineWidth: 2, lineCap: .round))
                        .rotationEffect(.degrees(-90))
                }
                .frame(width: 16, height: 16)

                Text("\(Int(bookProgress * 100))%")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }
        } else {
            Button {
                Haptics.medium()
                downloadManager.downloadBook(book: book, audioFiles: audioFiles)
            } label: {
                HStack(spacing: 4) {
                    Image(systemName: "arrow.down.circle")
                        .font(.caption)
                    Text("Download All")
                        .font(.caption)
                        .fontWeight(.medium)
                }
            }
            .buttonStyle(.plain)
            .foregroundStyle(.tint)
        }
    }

    private var emptyState: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 10) {
                Image(systemName: "waveform.badge.plus")
                    .font(.title3)
                    .foregroundStyle(.tint)

                VStack(alignment: .leading, spacing: 4) {
                    Text("No audio files yet")
                        .font(.subheadline)
                        .fontWeight(.semibold)

                    Text(canUploadAudio
                         ? "Upload audiobook parts from Files to start playback on this book."
                         : "Uploading is available for premium editor accounts.")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }
}
