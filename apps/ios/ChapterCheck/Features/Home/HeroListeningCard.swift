import Combine
import SwiftUI

/// Large, full-width card for the most recently listened audiobook.
///
/// Displays the book cover, title, author, progress bar, and part information.
/// Tapping the card resumes playback via `AudioPlayerManager`.
struct HeroListeningCard: View {
    let item: RecentListeningProgress
    @Environment(AudioPlayerManager.self) private var audioPlayer

    @Environment(\.showNowPlaying) private var showNowPlaying
    @State private var isResuming = false
    @State private var resumeCancellables = Set<AnyCancellable>()

    var body: some View {
        Button {
            resumePlayback()
        } label: {
            HStack(spacing: 16) {
                ZStack {
                    BookCoverView(r2Key: item.book.coverImageR2Key, size: 100)

                    Circle()
                        .fill(.black.opacity(0.4))
                        .frame(width: 40, height: 40)

                    if isResuming {
                        ProgressView()
                            .tint(.white)
                    } else {
                        Image(systemName: "play.fill")
                            .font(.system(size: 16))
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
                        ProgressView(value: item.progressFraction)
                            .tint(.accentColor)

                        HStack {
                            Text(item.formattedProgress)
                                .font(.caption)
                                .foregroundStyle(.secondary)

                            Spacer()

                            if item.totalPartsInt > 1 {
                                Text("Part \(item.audioFile.partNumber.map { Int($0) } ?? 1) of \(item.totalPartsInt)")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
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
        let position = item.positionSeconds
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
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in
                    // Finished (success or failure) — always reset loading state.
                    // The value handler already started playback on success.
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
