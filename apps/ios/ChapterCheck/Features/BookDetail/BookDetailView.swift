import SwiftUI
import UniformTypeIdentifiers

/// Full book detail screen.
///
/// Shows the book cover, metadata, reading status, community signal,
/// personal memory, notes, reviews, audio files, and description.
struct BookDetailView: View {
    let bookId: String

    @State private var viewModel = BookDetailViewModel()
    @State private var isReviewSheetPresented = false
    @State private var isAddToShelfPresented = false
    @State private var showDeleteDownloadConfirmation = false
    @State private var noteToEdit: BookNote?
    @State private var noteToDelete: BookNote?
    @State private var noteToPreview: BookNote?
    @State private var isFreeformNoteComposerPresented = false
    @State private var isAudioImporterPresented = false
    @State private var isAudioUploadQueuePresented = false
    @State private var audioUploadQueueItems: [AudioUploadQueueItem] = []
    @State private var audioUploadError: String?
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(\.showNowPlaying) private var showNowPlaying
    @Environment(\.showToast) private var showToast
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
            viewModel.audioPlayerManager = audioPlayer
            viewModel.showToast = { toast in showToast(toast) }
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
            if note.isAudioAnchored {
                BookNoteComposerSheet(
                    context: noteComposerContext(for: note),
                    tags: viewModel.noteTags,
                    onSave: { payload in
                        try await viewModel.updateNote(
                            noteId: note._id,
                            audioFileId: payload.audioFileId,
                            tagIds: payload.tagIds.isEmpty ? nil : payload.tagIds,
                            startSeconds: payload.startSeconds,
                            endSeconds: payload.endSeconds,
                            noteText: payload.noteText
                        )
                        Haptics.success()
                    },
                    onCreateTag: { name in
                        try await viewModel.createTag(name: name)
                    }
                )
            } else {
                FreeformNoteComposerSheet(
                    bookId: bookId,
                    tags: viewModel.noteTags,
                    existingNote: note,
                    onSave: { noteText, entryType, sourceText, tagIds, isPublic in
                        try await viewModel.updateNote(
                            noteId: note._id,
                            audioFileId: nil,
                            tagIds: tagIds.isEmpty ? nil : tagIds,
                            startSeconds: nil,
                            endSeconds: nil,
                            noteText: noteText,
                            entryType: entryType,
                            sourceText: sourceText,
                            isPublic: isPublic
                        )
                        Haptics.success()
                    },
                    onCreateTag: { name in
                        try await viewModel.createTag(name: name)
                    }
                )
            }
        }
        .sheet(item: $noteToPreview) { note in
            BookNotePreviewSheet(note: note)
        }
        .sheet(isPresented: $isFreeformNoteComposerPresented) {
            FreeformNoteComposerSheet(
                bookId: bookId,
                tags: viewModel.noteTags,
                onSave: { noteText, entryType, sourceText, tagIds, isPublic in
                    try await viewModel.createNote(
                        audioFileId: nil,
                        tagIds: tagIds.isEmpty ? nil : tagIds,
                        startSeconds: nil,
                        endSeconds: nil,
                        noteText: noteText,
                        entryType: entryType,
                        sourceText: sourceText,
                        isPublic: isPublic
                    )
                    Haptics.success()
                },
                onCreateTag: { name in
                    try await viewModel.createTag(name: name)
                }
            )
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
                // 1. Offline banner
                if viewModel.isOffline {
                    OfflineBanner()
                }

                // 2. Cover Image
                BookCoverView(r2Key: book.coverImageR2Key, displayMode: .fit(maxWidth: 200, maxHeight: 300))
                    .frame(maxWidth: .infinity)

                // 3. Title and Subtitle
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

                // 4. Compact metadata: authors, series, year, duration
                BookMetadataView(book: book)

                // 4b. Description (compact, under metadata)
                if let description = book.description, !description.isEmpty {
                    descriptionSection(description)
                }

                // 5. Status + actions: reading status picker, play/resume (if audio)
                if viewModel.hasAudioFiles {
                    if viewModel.userData?.readingStatus == .finished {
                        playButton(book)
                            .padding(.horizontal)
                        if !viewModel.isOffline {
                            statusActions
                                .padding(.horizontal)
                        }
                    } else {
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

                // 6. Community signal
                if !viewModel.isOffline {
                    CommunitySignalView(
                        ratingStats: viewModel.ratingStats,
                        bookGenres: viewModel.bookGenres
                    )

                    Divider()
                        .padding(.horizontal)
                }

                // 7. Your memory
                if !viewModel.isOffline {
                    YourMemoryView(
                        userData: viewModel.userData,
                        readingStatus: viewModel.userData?.readingStatus,
                        onSaveSummary: { text in
                            await viewModel.savePersonalSummary(text)
                        },
                        onOpenReviewSheet: {
                            isReviewSheetPresented = true
                        }
                    )

                    Divider()
                        .padding(.horizontal)
                }

                // 8. Your notes
                BookNotesListView(
                    notes: viewModel.filteredNotes,
                    tags: viewModel.noteTags,
                    selectedTagIds: Binding(
                        get: { viewModel.selectedNoteTagIds },
                        set: { viewModel.selectedNoteTagIds = $0 }
                    ),
                    filterOption: Binding(
                        get: { viewModel.notesFilterOption },
                        set: { viewModel.notesFilterOption = $0 }
                    ),
                    onAddNote: {
                        isFreeformNoteComposerPresented = true
                    },
                    onPlayNote: playNote,
                    onEditNote: { note in
                        noteToEdit = note
                    },
                    onDeleteNote: { note in
                        noteToDelete = note
                    }
                )

                // 9. Reviews (hidden when offline)
                if !viewModel.isOffline, !viewModel.sortedReviews.isEmpty || viewModel.userData?.readingStatus == .finished {
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

                // 10. Audio (collapsible, collapsed by default)
                if viewModel.hasAudioFiles || !viewModel.isOffline {
                    Divider()
                        .padding(.horizontal)

                    audioSection(book)
                }

                // Bottom spacing for mini player
                Spacer()
                    .frame(height: 100)
            }
            .padding(.top)
        }
    }

    // MARK: - Audio Section (Collapsible)

    @State private var isAudioSectionExpanded = false

    private func audioSection(_ book: BookWithDetails) -> some View {
        DisclosureGroup(isExpanded: $isAudioSectionExpanded) {
            AudioFileListView(
                audioFiles: viewModel.audioFiles,
                progress: viewModel.resolvedProgress,
                book: book,
                canUploadAudio: viewModel.canUploadAudio,
                canShowUploadControls: !viewModel.isOffline,
                onUploadRequested: {
                    isAudioImporterPresented = true
                },
                showHeader: false
            )
            .padding(.top, 8)
        } label: {
            HStack {
                Text("Audio Files")
                    .font(.headline)
                if !viewModel.audioFiles.isEmpty {
                    Text("\(viewModel.audioFiles.count)")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .tint(.primary)
        .padding(.horizontal)
    }

    // MARK: - Play Button

    private func playButton(_ book: BookWithDetails) -> some View {
        Button {
            if audioPlayer.currentBook?._id == book._id {
                if !audioPlayer.isPlaying { audioPlayer.resume() }
                showNowPlaying()
                return
            }
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
        viewModel.resolvedProgress != nil
            && viewModel.resumePosition(smartRewindEnabled: audioPlayer.isSmartRewindEnabled) > 0
    }

    private func playNote(_ note: BookNote) {
        Haptics.medium()
        noteToPreview = note
    }

    private func noteComposerContext(for note: BookNote) -> BookNoteComposerContext {
        BookNoteComposerContext(
            bookId: bookId,
            audioFiles: viewModel.audioFiles,
            anchorSeconds: ((note.startSeconds ?? 0) + (note.endSeconds ?? 0)) / 2,
            initialAudioFileId: note.audioFileId ?? "",
            initialStartSeconds: note.startSeconds ?? 0,
            initialEndSeconds: note.endSeconds ?? 0,
            existingNote: note
        )
    }

    private var readStatusView: some View {
        BookReadStatusView(
            userData: viewModel.userData,
            isLoading: viewModel.isLoading,
            onStatusChange: { status in
                Task { await viewModel.setReadingStatus(status) }
            },
            onOpenReview: {
                isReviewSheetPresented = true
            }
        )
    }

    private var statusActions: some View {
        readStatusView
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
                .lineLimit(isDescriptionExpanded ? nil : 1)
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
