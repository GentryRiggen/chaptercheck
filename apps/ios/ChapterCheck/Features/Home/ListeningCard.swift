import Combine
import SwiftUI

/// Compact card (160pt wide) for the horizontal continue listening scroll.
///
/// Shows book cover, title (2 lines max), and a progress bar.
/// Tapping resumes playback via `AudioPlayerManager`.
struct ListeningCard: View {
    let item: RecentListeningProgress
    @Environment(AudioPlayerManager.self) private var audioPlayer

    @Environment(\.showNowPlaying) private var showNowPlaying
    @State private var isResuming = false
    @State private var resumeCancellables = Set<AnyCancellable>()

    var body: some View {
        Button {
            resumePlayback()
        } label: {
            VStack(alignment: .leading, spacing: 6) {
                ZStack {
                    BookCoverView(r2Key: item.book.coverImageR2Key, size: 90)

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
            lastListenedAt: item.lastListenedAt
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
}
