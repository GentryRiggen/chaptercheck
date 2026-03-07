import Combine
import SwiftUI

/// Large, full-width card for the most recently listened audiobook.
///
/// Displays the book cover, title, author, progress bar, and part information.
/// Tapping the card resumes playback via `AudioPlayerManager`.
struct HeroListeningCard: View {
    let item: RecentListeningProgress
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager

    @Environment(\.showNowPlaying) private var showNowPlaying
    @State private var isResuming = false
    @State private var resumeCancellables = Set<AnyCancellable>()
    private let networkMonitor = NetworkMonitor.shared

    /// Whether the audio player currently has this book loaded.
    private var isCurrentBook: Bool {
        audioPlayer.currentBook?._id == item.bookId
    }

    /// Live position in seconds — from the player when this book is loaded, otherwise Convex data.
    private var livePosition: Double {
        guard isCurrentBook, audioPlayer.duration > 0 else { return item.positionSeconds }
        return audioPlayer.currentPosition
    }

    /// Live part duration — from the player when this book is loaded, otherwise Convex data.
    private var liveDuration: Double {
        guard isCurrentBook, audioPlayer.duration > 0 else { return item.audioFile.duration }
        return audioPlayer.duration
    }

    /// Live progress fraction from the player when this book is loaded, otherwise Convex data.
    private var liveProgressFraction: Double {
        guard liveDuration > 0 else { return item.progressFraction }
        return min(livePosition / liveDuration, 1)
    }

    /// Formatted time string like "1h 34m · 5h 39m left"
    private var liveTimeProgress: String {
        let position = livePosition
        let duration = liveDuration
        guard duration > 0 else { return item.formattedProgress }
        let remaining = max(0, duration - position)
        return "\(TimeFormatting.formatDuration(position)) · \(TimeFormatting.formatDuration(remaining)) left"
    }

    var body: some View {
        Button {
            resumePlayback()
        } label: {
            HStack(spacing: 16) {
                ZStack {
                    BookCoverView(r2Key: item.book.coverImageR2Key, displayMode: .fit(maxWidth: 140, maxHeight: 210))

                    Circle()
                        .fill(.black.opacity(0.4))
                        .frame(width: 44, height: 44)

                    if isResuming {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "play.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(.white)
                    }
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text(item.book.title)
                        .font(.headline)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let authorName = item.book.authors.first?.name {
                        Text(authorName)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Spacer()

                    VStack(alignment: .leading, spacing: 4) {
                        ProgressView(value: liveProgressFraction)

                        Text(liveTimeProgress)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(12)
            .background(.fill.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
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

        // Offline path: use downloaded data directly
        if !networkMonitor.isConnected && downloadManager.isBookDownloaded(item.bookId) {
            resumeFromDownload()
            return
        }

        isResuming = true

        let bookRepo = BookRepository()
        let audioRepo = AudioRepository()

        guard
            let bookPub = bookRepo.subscribeToBook(id: item.bookId),
            let filesPub = audioRepo.subscribeToAudioFiles(bookId: item.bookId)
        else {
            isResuming = false
            return
        }

        let targetFileId = item.audioFile._id
        let position = AudioPlayerManager.smartRewindPosition(
            from: item.positionSeconds,
            lastListenedAt: item.lastListenedAt,
            enabled: audioPlayer.isSmartRewindEnabled
        )
        let rate = item.playbackRate

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

    private func resumeFromDownload() {
        guard let (book, allFiles) = downloadManager.offlinePlaybackData(for: item.bookId) else { return }

        let targetFile = allFiles.first(where: { $0._id == item.audioFile._id }) ?? allFiles.first
        guard let audioFile = targetFile else { return }

        let position = AudioPlayerManager.smartRewindPosition(
            from: item.positionSeconds,
            lastListenedAt: item.lastListenedAt,
            enabled: audioPlayer.isSmartRewindEnabled
        )

        audioPlayer.play(
            book: book,
            audioFile: audioFile,
            allFiles: allFiles,
            startPosition: position,
            rate: item.playbackRate
        )
        showNowPlaying()
    }
}

#Preview {
    HeroListeningCard(
        item: RecentListeningProgress(
            _id: "1",
            bookId: "book1",
            book: RecentListeningBook(
                title: "The Way of Kings",
                coverImageR2Key: nil,
                seriesOrder: 1,
                authors: [BookAuthorSummary(_id: "a1", name: "Brandon Sanderson")],
                series: SeriesSummary(_id: "s1", name: "The Stormlight Archive")
            ),
            audioFile: RecentListeningAudioFile(
                _id: "af1",
                partNumber: 1,
                duration: 3600,
                displayName: "Part 1"
            ),
            positionSeconds: 1800,
            playbackRate: 1.0,
            progressFraction: 0.5,
            totalParts: 4,
            lastListenedAt: Date().timeIntervalSince1970 * 1000
        )
    )
    .environment(AudioPlayerManager())
    .padding()
}
