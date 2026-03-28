import Combine
import SwiftUI

/// Large, full-width card for the most recently listened audiobook.
///
/// Displays the book cover, title, author, progress bar, and part information
/// with an accent-gradient background. Tapping the card resumes playback via
/// `AudioPlayerManager`.
struct HeroListeningCard: View {
    let item: RecentListeningProgress
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(ThemeManager.self) private var themeManager

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
            HStack(spacing: 14) {
                // Compact cover with play overlay
                ZStack {
                    BookCoverView(r2Key: item.book.coverImageR2Key, displayMode: .fit(maxWidth: 80, maxHeight: 120))

                    Circle()
                        .fill(.black.opacity(0.4))
                        .frame(width: 36, height: 36)

                    if isResuming {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: isCurrentBook && audioPlayer.isPlaying ? "pause.fill" : "play.fill")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(.white)
                    }
                }

                // Book info + progress
                VStack(alignment: .leading, spacing: 6) {
                    Text(item.book.title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .lineLimit(2)
                        .multilineTextAlignment(.leading)

                    if let authorName = item.book.authors.first?.name {
                        Text(authorName)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .lineLimit(1)
                    }

                    Spacer(minLength: 0)

                    VStack(alignment: .leading, spacing: 5) {
                        GeometryReader { geo in
                            ZStack(alignment: .leading) {
                                Capsule()
                                    .fill(.fill.tertiary)
                                    .frame(height: 4)

                                Capsule()
                                    .fill(themeManager.accentColor)
                                    .frame(width: max(0, geo.size.width * liveProgressFraction), height: 4)
                            }
                        }
                        .frame(height: 4)

                        Text(liveTimeProgress)
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(12)
            .background(.fill.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: 14))
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
    .environment(AudioPlayerManager.shared)
    .padding()
}
