import SwiftUI

/// Large, full-width card for the most recently listened audiobook.
///
/// Displays the book cover, title, author, progress bar, and part information.
/// Tapping the card resumes playback via `AudioPlayerManager`.
struct HeroListeningCard: View {
    let item: RecentListeningProgress
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        Button {
            resumePlayback()
        } label: {
            HStack(spacing: 16) {
                BookCoverView(r2Key: item.book.coverImageR2Key, size: 100)

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
    }

    // MARK: - Actions

    private func resumePlayback() {
        Haptics.medium()

        // Build a minimal BookWithDetails for the player from the listening item.
        // The full book data will be loaded by the player if needed.
        Task {
            // Subscribe to get the full book details and audio files
            // For now, use the audio player's play method with what we have
            let audioRepo = AudioRepository()
            let bookRepo = BookRepository()

            // We need the full book and audio files to start playback.
            // The AudioPlayerManager needs these to enable part navigation.
            // Use a one-shot fetch pattern through the repository subscriptions.
        }
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
