import SwiftUI

/// Management screen for downloaded audiobooks.
///
/// Shows a storage summary, list of downloaded books with cover/title/size,
/// swipe-to-delete, and a "Delete All" button.
struct DownloadsView: View {
    @Environment(DownloadManager.self) private var downloadManager

    @State private var showDeleteAllConfirmation = false

    private var formattedStorageUsed: String {
        ByteCountFormatter.string(fromByteCount: downloadManager.totalStorageUsed, countStyle: .file)
    }

    var body: some View {
        List {
            if !downloadManager.downloadedBooks.isEmpty {
                // Storage summary
                Section {
                    HStack {
                        Label("Storage Used", systemImage: "internaldrive")
                        Spacer()
                        Text(formattedStorageUsed)
                            .foregroundStyle(.secondary)
                    }
                }

                // Downloaded books
                Section {
                    ForEach(downloadManager.downloadedBooks) { book in
                        bookRow(book)
                    }
                    .onDelete { indexSet in
                        for index in indexSet {
                            let book = downloadManager.downloadedBooks[index]
                            downloadManager.deleteBookDownload(bookId: book.bookId)
                        }
                    }
                } header: {
                    Text("Downloaded Books")
                }

                // Delete all
                Section {
                    Button("Delete All Downloads", role: .destructive) {
                        showDeleteAllConfirmation = true
                    }
                }
            } else {
                // Empty state
                ContentUnavailableView(
                    "No Downloads",
                    systemImage: "arrow.down.circle",
                    description: Text("Downloaded books will appear here for offline listening.")
                )
            }
        }
        .navigationTitle("Downloads")
        .confirmationDialog(
            "Delete All Downloads?",
            isPresented: $showDeleteAllConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete All", role: .destructive) {
                downloadManager.deleteAllDownloads()
            }
        } message: {
            Text("This will remove all downloaded audiobooks and free up \(formattedStorageUsed) of storage.")
        }
    }

    // MARK: - Book Row

    private func bookRow(_ book: BookDownloadInfo) -> some View {
        HStack(spacing: 12) {
            // Cover image
            BookCoverView(r2Key: book.coverImageR2Key, size: 50)

            // Info
            VStack(alignment: .leading, spacing: 2) {
                Text(book.bookTitle)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)

                if !book.authorNames.isEmpty {
                    Text(book.authorNames.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }

                HStack(spacing: 4) {
                    statusIcon(for: book)

                    Text("\(book.files.count) file\(book.files.count == 1 ? "" : "s")")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    Text("·")
                        .font(.caption2)
                        .foregroundStyle(.secondary)

                    Text(book.formattedSize)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()
        }
        .padding(.vertical, 2)
    }

    @ViewBuilder
    private func statusIcon(for book: BookDownloadInfo) -> some View {
        switch book.state {
        case .complete:
            Image(systemName: "checkmark.circle.fill")
                .font(.caption2)
                .foregroundStyle(.green)
        case .downloading:
            ProgressView()
                .scaleEffect(0.6)
                .frame(width: 12, height: 12)
        case .partial:
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.caption2)
                .foregroundStyle(.orange)
        case .none:
            EmptyView()
        }
    }
}
