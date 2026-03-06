import SwiftUI

/// Full book detail screen.
///
/// Shows the book cover, metadata (authors, series, rating), a play/resume button,
/// read status badge, audio file list, and reviews section.
struct BookDetailView: View {
    let bookId: String

    @State private var viewModel = BookDetailViewModel()
    @State private var isReviewSheetPresented = false
    @State private var isAddToShelfPresented = false
    @State private var showDeleteDownloadConfirmation = false
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(\.showNowPlaying) private var showNowPlaying

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
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    isAddToShelfPresented = true
                } label: {
                    Image(systemName: "bookmark")
                }
            }
        }
        .onAppear {
            viewModel.downloadManager = downloadManager
            viewModel.subscribe(bookId: bookId)

            if downloadManager.pendingDeletePromptBookId == bookId {
                downloadManager.pendingDeletePromptBookId = nil
                showDeleteDownloadConfirmation = true
            }
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
        .sheet(isPresented: $isAddToShelfPresented) {
            AddToShelfSheet(bookId: bookId)
        }
        .sheet(isPresented: $isReviewSheetPresented) {
            BookReviewSheet(
                bookId: bookId,
                existingUserData: viewModel.userData,
                allGenres: viewModel.allGenres,
                existingGenreVoteIds: viewModel.myGenreVoteIds,
                onSave: { formData in
                    isReviewSheetPresented = false
                    Task { await viewModel.saveReview(formData) }
                },
                onCancel: {
                    isReviewSheetPresented = false
                }
            )
        }
        .confirmationDialog(
            "Delete Download?",
            isPresented: $showDeleteDownloadConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete Download", role: .destructive) {
                downloadManager.deleteBookDownload(bookId: bookId)
            }
            Button("No, Thank You") {}
        } message: {
            Text("You've finished this book. Delete the downloaded files to free up storage?")
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func bookContent(_ book: BookWithDetails) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                // Cover Image
                BookCoverView(r2Key: book.coverImageR2Key, displayMode: .fit(maxWidth: 200, maxHeight: 300))
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

                // Description
                if let description = book.description, !description.isEmpty {
                    descriptionSection(description)
                }

                // Play / Resume Button + Read Status
                if viewModel.hasAudioFiles {
                    if viewModel.userData?.isRead == true {
                        // Read: full-width play button, read status below
                        playButton(book)
                            .padding(.horizontal)
                        readStatusView
                            .padding(.horizontal)
                    } else {
                        // Unread: play button + compact "Mark as Read" side-by-side
                        HStack(spacing: 12) {
                            playButton(book)
                            readStatusView
                        }
                        .padding(.horizontal)
                    }
                } else {
                    readStatusView
                        .padding(.horizontal)
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
                if !viewModel.sortedReviews.isEmpty || viewModel.userData?.isRead == true {
                    Divider()
                        .padding(.horizontal)

                    ReviewsListView(
                        reviews: viewModel.sortedReviews,
                        sortOption: Binding(
                            get: { viewModel.reviewSortOption },
                            set: { viewModel.reviewSortOption = $0 }
                        ),
                        userHasReview: viewModel.userHasReview,
                        isOwnReviewPrivate: viewModel.userData?.isReviewPrivate ?? false,
                        onWriteReview: {
                            isReviewSheetPresented = true
                        }
                    )
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
                startPosition: viewModel.resumePosition(smartRewindEnabled: audioPlayer.isSmartRewindEnabled),
                rate: viewModel.resumeRate
            )
            showNowPlaying()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "play.fill")
                Text(hasExistingProgress ? "Resume" : "Play")
                    .fontWeight(.semibold)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 14)
        }
        .buttonStyle(.borderedProminent)
    }

    private var hasExistingProgress: Bool {
        viewModel.progress != nil && viewModel.resumePosition(smartRewindEnabled: audioPlayer.isSmartRewindEnabled) > 0
    }

    private var readStatusView: some View {
        BookReadStatusView(
            userData: viewModel.userData,
            isLoading: viewModel.isLoading,
            onMarkAsRead: {
                Task { await viewModel.markAsRead() }
            },
            onOpenReview: {
                isReviewSheetPresented = true
            }
        )
    }

    // MARK: - Description

    @State private var isDescriptionExpanded = false
    @State private var isDescriptionTruncated = false
    @State private var truncatedHeight: CGFloat = 0
    @State private var fullHeight: CGFloat = 0

    private func descriptionSection(_ text: String) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("About")
                .font(.headline)

            Text(text)
                .font(.body)
                .foregroundStyle(.secondary)
                .lineLimit(isDescriptionExpanded ? nil : 2)
                .background {
                    GeometryReader { geo in
                        Color.clear
                            .onAppear { truncatedHeight = geo.size.height }
                            .onChange(of: geo.size.height) { truncatedHeight = geo.size.height }
                    }
                }
                .overlay {
                    // Invisible full-height text to measure unconstrained height
                    Text(text)
                        .font(.body)
                        .lineLimit(nil)
                        .fixedSize(horizontal: false, vertical: true)
                        .hidden()
                        .background {
                            GeometryReader { geo in
                                Color.clear
                                    .onAppear {
                                        fullHeight = geo.size.height
                                        isDescriptionTruncated = fullHeight > truncatedHeight + 1
                                    }
                                    .onChange(of: geo.size.height) {
                                        fullHeight = geo.size.height
                                        isDescriptionTruncated = fullHeight > truncatedHeight + 1
                                    }
                            }
                        }
                }

            if isDescriptionTruncated || isDescriptionExpanded {
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        isDescriptionExpanded.toggle()
                    }
                } label: {
                    Text(isDescriptionExpanded ? "Show Less" : "Show More")
                        .font(.subheadline)
                        .fontWeight(.medium)
                }
                .buttonStyle(.plain)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
    }
}
