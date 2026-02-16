import SwiftUI

/// Full book detail screen.
///
/// Shows the book cover, metadata (authors, series, rating), a play/resume button,
/// audio file list, and reviews section.
struct BookDetailView: View {
    let bookId: String

    @State private var viewModel = BookDetailViewModel()
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        Group {
            if viewModel.isLoading {
                LoadingView()
            } else if let error = viewModel.error, viewModel.book == nil {
                ErrorView(message: error) {
                    viewModel.unsubscribe()
                    viewModel.subscribe(bookId: bookId)
                }
            } else if let book = viewModel.book {
                bookContent(book)
            } else {
                EmptyStateView(
                    icon: "book.closed",
                    title: "Book Not Found",
                    subtitle: "This book may have been removed."
                )
            }
        }
        .navigationTitle(viewModel.book?.title ?? "Book")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            viewModel.subscribe(bookId: bookId)
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func bookContent(_ book: BookWithDetails) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                // Cover Image
                BookCoverView(r2Key: book.coverImageR2Key, size: 200)
                    .frame(maxWidth: .infinity)

                // Title and Subtitle
                VStack(spacing: 4) {
                    Text(book.title)
                        .font(.title2)
                        .fontWeight(.bold)
                        .multilineTextAlignment(.center)

                    if let subtitle = book.subtitle {
                        Text(subtitle)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                    }
                }

                // Metadata
                BookMetadataView(
                    book: book,
                    ratingStats: viewModel.ratingStats
                )

                // Play / Resume Button
                if viewModel.hasAudioFiles {
                    playButton(book)
                }

                // Description
                if let description = book.description, !description.isEmpty {
                    descriptionSection(description)
                }

                Divider()
                    .padding(.horizontal)

                // Audio Files
                if viewModel.hasAudioFiles {
                    AudioFileListView(
                        audioFiles: viewModel.audioFiles,
                        progress: viewModel.progress,
                        book: book
                    )
                }

                // Reviews
                if !viewModel.reviews.isEmpty {
                    Divider()
                        .padding(.horizontal)

                    ReviewsListView(reviews: viewModel.reviews)
                }

                // Bottom spacing for mini player
                Spacer()
                    .frame(height: 100)
            }
            .padding(.top)
        }
    }

    // MARK: - Play Button

    private func playButton(_ book: BookWithDetails) -> some View {
        Button {
            guard let audioFile = viewModel.resumeAudioFile else { return }
            Haptics.medium()
            audioPlayer.play(
                book: book,
                audioFile: audioFile,
                allFiles: viewModel.audioFiles,
                startPosition: viewModel.resumePosition,
                rate: viewModel.resumeRate
            )
        } label: {
            HStack(spacing: 8) {
                Image(systemName: hasExistingProgress ? "play.fill" : "play.fill")
                Text(hasExistingProgress ? "Resume" : "Play")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
        }
        .buttonStyle(.borderedProminent)
        .padding(.horizontal)
    }

    private var hasExistingProgress: Bool {
        viewModel.progress != nil && viewModel.resumePosition > 0
    }

    // MARK: - Description

    private func descriptionSection(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About")
                .font(.headline)

            Text(text)
                .font(.body)
                .foregroundStyle(.secondary)
                .lineLimit(6)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
    }
}
