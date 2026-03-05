import SwiftUI

/// Home screen shown when the device is offline.
///
/// Displays an offline banner and a list of fully downloaded books that can be
/// played without a network connection. Each row navigates to `OfflineBookDetailView`.
struct OfflineHomeView: View {
    @Environment(DownloadManager.self) private var downloadManager

    private var completedBooks: [BookDownloadInfo] {
        downloadManager.downloadedBooks.filter(\.isComplete)
    }

    var body: some View {
        Group {
            if completedBooks.isEmpty {
                emptyState
            } else {
                bookList
            }
        }
        .navigationTitle("ChapterCheck")
    }

    // MARK: - Book List

    private var bookList: some View {
        List {
            Section {
                offlineBanner
            }

            Section {
                ForEach(completedBooks) { book in
                    NavigationLink(value: AppDestination.offlineBook(bookId: book.bookId)) {
                        bookRow(book)
                    }
                }
            } header: {
                Text("Downloaded Books")
            }

            Color.clear
                .frame(height: 80)
                .listRowBackground(Color.clear)
                .listRowSeparator(.hidden)
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: 20) {
            offlineBanner
                .padding(.horizontal)

            ContentUnavailableView(
                "No Downloaded Books",
                systemImage: "arrow.down.circle",
                description: Text("Download books while online to listen offline.")
            )
        }
    }

    // MARK: - Offline Banner

    private var offlineBanner: some View {
        HStack(spacing: 10) {
            Image(systemName: "wifi.slash")
                .font(.subheadline)
                .foregroundStyle(.orange)

            Text("You're offline. Only downloaded books are available.")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }

    // MARK: - Book Row

    private func bookRow(_ book: BookDownloadInfo) -> some View {
        HStack(spacing: 12) {
            BookCoverView(r2Key: book.coverImageR2Key, size: 50)

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

                Text("\(book.files.count) file\(book.files.count == 1 ? "" : "s") · \(book.formattedSize)")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .padding(.vertical, 2)
    }
}
