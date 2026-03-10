import Combine
import SwiftUI

/// Compact card (160pt wide) for the horizontal continue listening scroll.
///
/// Shows book cover, title (2 lines max), and a progress bar.
/// Tapping resumes playback via `AudioPlayerManager`.
struct ListeningCard: View {
    let item: RecentListeningProgress
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager

    @Environment(\.showNowPlaying) private var showNowPlaying
    @State private var isResuming = false
    @State private var resumeCancellables = Set<AnyCancellable>()
    private let networkMonitor = NetworkMonitor.shared

    private var isCurrentBook: Bool {
        audioPlayer.currentBook?._id == item.bookId
    }

    var body: some View {
        Button {
            resumePlayback()
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                ZStack {
                    BookCoverView(r2Key: item.book.coverImageR2Key, displayMode: .fit(maxWidth: 140, maxHeight: 210))

                    Circle()
                        .fill(.black.opacity(0.4))
                        .frame(width: 36, height: 36)

                    if isResuming {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "play.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(.white)
                    }
                }

                Text(item.book.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(height: 32, alignment: .top)

            }
            .frame(width: 140)
        }
        .buttonStyle(.plain)
        .disabled(isResuming)
        .contextMenu {
            NavigationLink(value: AppDestination.book(id: item.bookId)) {
                Label("Go to Book", systemImage: "book")
            }
            if let author = item.book.authors.first {
                NavigationLink(value: AppDestination.author(id: author._id)) {
                    Label("Go to Author", systemImage: "person")
                }
            }
            if let series = item.book.series {
                NavigationLink(value: AppDestination.series(id: series._id)) {
                    Label("Go to Series", systemImage: "books.vertical")
                }
            }
        }
        .onDisappear { resumeCancellables.removeAll() }
    }

    // MARK: - Actions

    private func resumePlayback() {
        Haptics.medium()

        // If the player already has this book loaded, just resume from its current position
        if isCurrentBook {
            if !audioPlayer.isPlaying { audioPlayer.resume() }
            showNowPlaying()
            return
        }

        isResuming = true

        Task {
            let local = await PlaybackProgressStore.shared.progress(for: item.bookId)
            let resolved = item.resolvedProgress(local: local)

            await MainActor.run {
                if !networkMonitor.isConnected {
                    if downloadManager.isBookDownloaded(item.bookId) {
                        resumeFromDownload(using: resolved)
                    }
                    isResuming = false
                    return
                }

                startRemoteResume(using: resolved)
            }
        }
    }

    private func startRemoteResume(using resolved: CachedListeningProgress) {
        let bookRepo = BookRepository()
        let audioRepo = AudioRepository()

        guard
            let bookPub = bookRepo.subscribeToBook(id: item.bookId),
            let filesPub = audioRepo.subscribeToAudioFiles(bookId: item.bookId)
        else {
            isResuming = false
            return
        }

        let targetFileId = resolved.audioFileId
        let position = AudioPlayerManager.smartRewindPosition(
            from: resolved.positionSeconds,
            lastListenedAt: resolved.timestamp,
            enabled: audioPlayer.isSmartRewindEnabled
        )
        let rate = resolved.playbackRate

        bookPub
            .combineLatest(filesPub)
            .compactMap { bookOrNil, files -> (BookWithDetails, AudioFile, [AudioFile])? in
                guard
                    let book = bookOrNil,
                    let targetFile = files.first(where: { $0._id == targetFileId })
                else { return nil }
                return (book, targetFile, files)
            }
            .first()
            .timeout(.seconds(8), scheduler: DispatchQueue.main)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in
                    isResuming = false
                    resumeCancellables.removeAll()
                },
                receiveValue: { book, audioFile, allFiles in
                    audioPlayer.play(
                        book: book,
                        audioFile: audioFile,
                        allFiles: allFiles,
                        startPosition: position,
                        rate: rate
                    )
                    showNowPlaying()
                }
            )
            .store(in: &resumeCancellables)
    }

    private func resumeFromDownload(using resolved: CachedListeningProgress) {
        guard let (book, allFiles) = downloadManager.offlinePlaybackData(for: item.bookId) else { return }

        let targetFile = allFiles.first(where: { $0._id == resolved.audioFileId }) ?? allFiles.first
        guard let audioFile = targetFile else { return }

        let position = AudioPlayerManager.smartRewindPosition(
            from: resolved.positionSeconds,
            lastListenedAt: resolved.timestamp,
            enabled: audioPlayer.isSmartRewindEnabled
        )

        audioPlayer.play(
            book: book,
            audioFile: audioFile,
            allFiles: allFiles,
            startPosition: position,
            rate: resolved.playbackRate
        )
        showNowPlaying()
    }
}
