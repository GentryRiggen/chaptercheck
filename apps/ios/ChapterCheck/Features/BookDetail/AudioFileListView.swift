import SwiftUI

/// Vertical list of audio file parts for a book.
///
/// Each row shows the part number, display name, duration, file size, download status,
/// and a play button. The header includes a "Download All" action.
struct AudioFileListView: View {
    let audioFiles: [AudioFile]
    let progress: ListeningProgress?
    let book: BookWithDetails

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
            HStack {
                Text("Audio Files")
                    .font(.headline)

                Spacer()

                if allDownloaded {
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
            .padding(.horizontal)

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
