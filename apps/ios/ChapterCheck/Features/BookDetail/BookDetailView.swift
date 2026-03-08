import SwiftUI
import UniformTypeIdentifiers

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
    @State private var noteToEdit: BookNote?
    @State private var noteToDelete: BookNote?
    @State private var noteToPreview: BookNote?
    @State private var isAudioImporterPresented = false
    @State private var isAudioUploadQueuePresented = false
    @State private var audioUploadQueueItems: [AudioUploadQueueItem] = []
    @State private var audioUploadError: String?
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(\.showNowPlaying) private var showNowPlaying
    private let networkMonitor = NetworkMonitor.shared

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
                .disabled(viewModel.isOffline)
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
        .onChange(of: networkMonitor.isConnected) { _, isConnected in
            if isConnected {
                viewModel.recoverFromOffline()
            }
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
                canCreateGenres: viewModel.currentUser?.permissions.canCreateContent == true,
                genreRepository: viewModel.genreRepository,
                onSave: { formData in
                    isReviewSheetPresented = false
                    Task { await viewModel.saveReview(formData) }
                },
                onCancel: {
                    isReviewSheetPresented = false
                }
            )
        }
        .sheet(item: $noteToEdit) { note in
            BookNoteComposerSheet(
                context: noteComposerContext(for: note),
                categories: viewModel.noteCategories,
                onSave: { payload in
                    try await viewModel.updateNote(
                        noteId: note._id,
                        audioFileId: payload.audioFileId,
                        categoryId: payload.categoryId,
                        startSeconds: payload.startSeconds,
                        endSeconds: payload.endSeconds,
                        noteText: payload.noteText
                    )
                    Haptics.success()
                },
                onCreateCategory: { name, colorToken in
                    try await viewModel.createCategory(name: name, colorToken: colorToken)
                }
            )
        }
        .sheet(item: $noteToPreview) { note in
            BookNotePreviewSheet(note: note)
        }
        .sheet(isPresented: $isAudioUploadQueuePresented, onDismiss: releaseImportedAudioFiles) {
            if let book = viewModel.book {
                AudioUploadQueueSheet(
                    bookId: book._id,
                    initialItems: audioUploadQueueItems,
                    onFinished: {
                        isAudioUploadQueuePresented = false
                    }
                )
            }
        }
        .fileImporter(
            isPresented: $isAudioImporterPresented,
            allowedContentTypes: [.audio],
            allowsMultipleSelection: true
        ) { result in
            handleImportedAudioFiles(result)
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
        .confirmationDialog(
            "Delete note?",
            isPresented: Binding(
                get: { noteToDelete != nil },
                set: { if !$0 { noteToDelete = nil } }
            ),
            titleVisibility: .visible
        ) {
            Button("Delete Note", role: .destructive) {
                guard let noteToDelete else { return }
                Task {
                    try? await viewModel.deleteNote(noteId: noteToDelete._id)
                    Haptics.success()
                    self.noteToDelete = nil
                }
            }
            Button("Cancel", role: .cancel) {
                noteToDelete = nil
            }
        }
        .alert("Upload Error", isPresented: Binding(
            get: { audioUploadError != nil },
            set: { if !$0 { audioUploadError = nil } }
        )) {
            Button("OK", role: .cancel) {
                audioUploadError = nil
            }
        } message: {
            Text(audioUploadError ?? "")
        }
    }

    // MARK: - Content

    @ViewBuilder
    private func bookContent(_ book: BookWithDetails) -> some View {
        ScrollView {
            VStack(spacing: 24) {
                if viewModel.isOffline {
                    OfflineBanner()
                }

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
                        if !viewModel.isOffline {
                            readStatusView
                                .padding(.horizontal)
                        }
                    } else {
                        // Unread: play button + compact "Mark as Read" side-by-side
                        HStack(spacing: 12) {
                            playButton(book)
                            if !viewModel.isOffline {
                                readStatusView
                            }
                        }
                        .padding(.horizontal)
                    }
                } else if !viewModel.isOffline {
                    readStatusView
                        .padding(.horizontal)
                }

                Divider()
                    .padding(.horizontal)

                // Audio Files
                if viewModel.hasAudioFiles || !viewModel.isOffline {
                    AudioFileListView(
                        audioFiles: viewModel.audioFiles,
                        progress: viewModel.progress,
                        book: book,
                        canUploadAudio: viewModel.canUploadAudio,
                        canShowUploadControls: !viewModel.isOffline,
                        onUploadRequested: {
                            isAudioImporterPresented = true
                        }
                    )
                }

                Divider()
                    .padding(.horizontal)

                BookNotesListView(
                    notes: viewModel.filteredNotes,
                    categories: viewModel.noteCategories,
                    selectedCategoryId: Binding(
                        get: { viewModel.selectedNoteCategoryId },
                        set: { viewModel.selectedNoteCategoryId = $0 }
                    ),
                    filterOption: Binding(
                        get: { viewModel.notesFilterOption },
                        set: { viewModel.notesFilterOption = $0 }
                    ),
                    onPlayNote: playNote,
                    onEditNote: { note in
                        noteToEdit = note
                    },
                    onDeleteNote: { note in
                        noteToDelete = note
                    }
                )

                // Reviews (hidden when offline)
                if !viewModel.isOffline, !viewModel.sortedReviews.isEmpty || viewModel.userData?.isRead == true {
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

    private func playNote(_ note: BookNote) {
        Haptics.medium()
        noteToPreview = note
    }

    private func noteComposerContext(for note: BookNote) -> BookNoteComposerContext {
        BookNoteComposerContext(
            bookId: bookId,
            audioFiles: viewModel.audioFiles,
            anchorSeconds: (note.startSeconds + note.endSeconds) / 2,
            initialAudioFileId: note.audioFileId,
            initialStartSeconds: note.startSeconds,
            initialEndSeconds: note.endSeconds,
            existingNote: note
        )
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

    private func handleImportedAudioFiles(_ result: Result<[URL], Error>) {
        switch result {
        case .success(let urls):
            Task {
                await prepareUploadQueue(from: urls)
            }
        case .failure(let error):
            audioUploadError = error.localizedDescription
        }
    }

    @MainActor
    private func prepareUploadQueue(from urls: [URL]) async {
        guard !urls.isEmpty else { return }

        let repository = AudioUploadRepository()
        let nextPartNumber = max(viewModel.audioFiles.map(\.partNumberInt).max() ?? 0, viewModel.audioFiles.count) + 1

        var importedItems: [AudioUploadQueueItem] = []
        var errors: [String] = []

        for (index, url) in urls.enumerated() {
            let hasSecurityScopedAccess = url.startAccessingSecurityScopedResource()

            do {
                let values = try url.resourceValues(forKeys: [.fileSizeKey, .totalFileAllocatedSizeKey, .contentTypeKey, .nameKey])
                let fileSize = Int64(values.fileSize ?? values.totalFileAllocatedSize ?? 0)

                guard fileSize > 0 else {
                    if hasSecurityScopedAccess {
                        url.stopAccessingSecurityScopedResource()
                    }
                    errors.append("\(url.lastPathComponent): file size is unavailable.")
                    continue
                }

                guard fileSize <= 1_073_741_824 else {
                    if hasSecurityScopedAccess {
                        url.stopAccessingSecurityScopedResource()
                    }
                    errors.append("\(url.lastPathComponent): exceeds the 1 GB limit.")
                    continue
                }

                let contentType = mimeType(for: values.contentType, url: url)
                let duration = await repository.extractDuration(from: url)

                importedItems.append(
                    AudioUploadQueueItem(
                        fileURL: url,
                        fileName: values.name ?? url.lastPathComponent,
                        fileSize: fileSize,
                        contentType: contentType,
                        hasSecurityScopedAccess: hasSecurityScopedAccess,
                        partNumber: nextPartNumber + index,
                        duration: duration
                    )
                )
            } catch {
                if hasSecurityScopedAccess {
                    url.stopAccessingSecurityScopedResource()
                }
                errors.append("\(url.lastPathComponent): \(error.localizedDescription)")
            }
        }

        if !importedItems.isEmpty {
            audioUploadQueueItems = importedItems
            isAudioUploadQueuePresented = true
        }

        if !errors.isEmpty {
            audioUploadError = errors.joined(separator: "\n")
        }
    }

    private func releaseImportedAudioFiles() {
        for item in audioUploadQueueItems where item.hasSecurityScopedAccess {
            item.fileURL.stopAccessingSecurityScopedResource()
        }
        audioUploadQueueItems = []
    }

    private func mimeType(for type: UTType?, url: URL) -> String {
        if let mimeType = type?.preferredMIMEType {
            return mimeType
        }

        if let inferredType = UTType(filenameExtension: url.pathExtension),
           let mimeType = inferredType.preferredMIMEType {
            return mimeType
        }

        return "application/octet-stream"
    }
}
