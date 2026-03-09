import SwiftUI

/// Download/progress/delete button for a book's audio files.
///
/// Displays different states based on the book's download status:
/// - **None**: "Download" button with total size label
/// - **Downloading**: Circular progress with percentage and cancel button
/// - **Complete**: "Downloaded" checkmark with delete button
/// - **Partial/Failed**: "Retry Download" with warning icon
struct BookDownloadButton: View {
    let book: BookWithDetails
    let audioFiles: [AudioFile]

    @Environment(DownloadManager.self) private var downloadManager
    @State private var showDeleteDownloadConfirmation = false

    private var state: BookDownloadState {
        downloadManager.bookDownloadState(book._id)
    }

    private var progress: Double {
        downloadManager.bookProgress(book._id, audioFileIds: audioFiles.map(\._id))
    }

    private var totalSize: String {
        let bytes = audioFiles.reduce(Int64(0)) { $0 + Int64($1.fileSize) }
        return ByteCountFormatter.string(fromByteCount: bytes, countStyle: .file)
    }

    var body: some View {
        Group {
            switch state {
            case .none:
                downloadButton
            case .downloading:
                downloadingView
            case .complete:
                completedView
            case .partial:
                retryButton
            }
        }
        .padding(.horizontal)
        .confirmationDialog(
            "Delete download?",
            isPresented: $showDeleteDownloadConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete Download", role: .destructive) {
                downloadManager.deleteBookDownload(bookId: book._id)
            }
            Button("Cancel", role: .cancel) {}
        } message: {
            Text("This will remove all downloaded audio files for \(book.title) from this device.")
        }
    }

    // MARK: - States

    private var downloadButton: some View {
        Button {
            Haptics.medium()
            downloadManager.downloadBook(book: book, audioFiles: audioFiles)
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "arrow.down.circle")
                Text("Download")
                    .fontWeight(.medium)
                Text("(\(totalSize))")
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .buttonStyle(.bordered)
        .accessibilityLabel("Download book, \(totalSize)")
    }

    private var downloadingView: some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .stroke(.secondary.opacity(0.3), lineWidth: 3)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(.tint, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
            }
            .frame(width: 24, height: 24)

            Text("\(Int(progress * 100))%")
                .font(.subheadline)
                .fontWeight(.medium)
                .monospacedDigit()

            Text("Downloading...")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            Button {
                Haptics.light()
                downloadManager.cancelBookDownload(bookId: book._id)
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(.secondary)
                    .font(.title3)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Cancel download")
        }
        .padding(.vertical, 8)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Downloading, \(Int(progress * 100)) percent")
    }

    private var completedView: some View {
        HStack(spacing: 8) {
            Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.green)

            Text("Downloaded")
                .font(.subheadline)
                .fontWeight(.medium)

            if let info = downloadManager.downloadedBooks.first(where: { $0.bookId == book._id }) {
                Text("(\(info.formattedSize))")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                Haptics.light()
                showDeleteDownloadConfirmation = true
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(.red)
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Delete download")
        }
        .padding(.vertical, 8)
    }

    private var retryButton: some View {
        Button {
            Haptics.medium()
            downloadManager.deleteBookDownload(bookId: book._id)
            downloadManager.downloadBook(book: book, audioFiles: audioFiles)
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "exclamationmark.triangle")
                    .foregroundStyle(.orange)
                Text("Retry Download")
                    .fontWeight(.medium)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
        }
        .buttonStyle(.bordered)
        .accessibilityLabel("Retry download")
    }
}
