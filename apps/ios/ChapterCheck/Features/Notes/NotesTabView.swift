import SwiftUI

struct NotesTabView: View {
    @State private var viewModel = NotesTabViewModel()
    @State private var showBookPicker = false
    @State private var selectedBookForNewNote: BookWithDetails?
    @State private var previewNote: CrossBookNote?
    @State private var editingNote: CrossBookNote?
    @State private var showComposerForSelectedBook = false
    /// Set when editing an audio-anchored note — holds the fetched context and original note.
    @State private var audioNoteEditContext: (context: BookNoteComposerContext, note: CrossBookNote)?
    @State private var isFetchingAudioFiles = false
    @State private var showTagFilter = false
    @Environment(TagProvider.self) private var tagProvider
    @Environment(\.pushDestination) private var pushDestination

    private let networkMonitor = NetworkMonitor.shared

    var body: some View {
        content
            .noteSheets(
                viewModel: viewModel,
                showBookPicker: $showBookPicker,
                selectedBookForNewNote: $selectedBookForNewNote,
                showComposerForSelectedBook: $showComposerForSelectedBook,
                previewNote: $previewNote,
                editingNote: $editingNote,
                audioNoteEditContext: $audioNoteEditContext,
                showTagFilter: $showTagFilter,
                pushDestination: pushDestination
            )
    }

    private var content: some View {
        Group {
            if viewModel.isLoading {
                NotesSkeletonView()
            } else if let error = viewModel.error {
                ContentUnavailableView(
                    "Something went wrong",
                    systemImage: "exclamationmark.triangle",
                    description: Text(error)
                )
            } else if viewModel.allNotes.isEmpty {
                emptyState
            } else {
                notesList
            }
        }
        .navigationTitle("Notes")
        .searchable(text: $viewModel.searchText, prompt: "Search notes...")
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button {
                    showBookPicker = true
                } label: {
                    Image(systemName: "plus")
                }
                .disabled(viewModel.isOffline)
            }
        }
        .onAppear {
            viewModel.allTags = tagProvider.tags
            viewModel.subscribe()
        }
        .onDisappear {
            viewModel.unsubscribe()
        }
        .onChange(of: networkMonitor.isConnected) { wasConnected, isConnected in
            if !wasConnected && isConnected {
                viewModel.recoverFromOffline()
            }
        }
        .onChange(of: tagProvider.tags) { _, tags in
            viewModel.allTags = tags
            let validIds = Set(tags.map(\._id))
            viewModel.selectedTagIds = viewModel.selectedTagIds.intersection(validIds)
        }
    }

    // MARK: - Edit Note

    /// Route edit taps to the appropriate composer based on whether the note has audio clip data.
    ///
    /// Audio-anchored notes need `BookNoteComposerSheet` so the clip metadata (audioFileId,
    /// startSeconds, endSeconds) is preserved on save. Audio files are fetched on-demand since
    /// `NotesTabView` does not maintain a per-book audio file subscription.
    private func editNote(_ note: CrossBookNote) {
        if note.isAudioAnchored {
            Task {
                isFetchingAudioFiles = true
                defer { isFetchingAudioFiles = false }
                do {
                    let audioFiles = try await viewModel.fetchAudioFiles(for: note.bookId)
                    let bookNote = note.asBookNote
                    guard let audioFileId = bookNote.audioFileId else {
                        editingNote = note
                        return
                    }
                    let startSecs = bookNote.startSeconds ?? 0
                    let endSecs = bookNote.endSeconds ?? 0
                    let context = BookNoteComposerContext(
                        bookId: note.bookId,
                        audioFiles: audioFiles,
                        anchorSeconds: (startSecs + endSecs) / 2,
                        initialAudioFileId: audioFileId,
                        initialStartSeconds: startSecs,
                        initialEndSeconds: endSecs,
                        existingNote: bookNote
                    )
                    audioNoteEditContext = (context: context, note: note)
                } catch {
                    // Fallback: open freeform editor so the user can still edit note text
                    editingNote = note
                }
            }
        } else {
            editingNote = note
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        ContentUnavailableView(
            "No Notes Yet",
            systemImage: "note.text",
            description: Text("Capture moments from the player or add freeform notes to any book.")
        )
    }

    // MARK: - Notes List

    private var notesList: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                if viewModel.isOffline {
                    OfflineBanner()
                        .frame(maxWidth: .infinity)
                }

                statsRibbon
                entryTypeChips
                sortAndFilterHeader

                if viewModel.sortMode == .byBook {
                    groupedByBookContent
                } else {
                    flatNotesList
                }

                Spacer().frame(height: 80)
            }
            .padding(.top)
        }
        .refreshable { await viewModel.refresh() }
    }

    // MARK: - Stats Ribbon

    private var statsRibbon: some View {
        HStack(spacing: 0) {
            statCell(value: viewModel.noteCount, label: "Notes")
            Divider().frame(height: 30)
            statCell(value: viewModel.distinctBookCount, label: "Books")
            Divider().frame(height: 30)
            statCell(value: viewModel.tagCount, label: "Tags")
        }
        .padding(.horizontal)
    }

    private func statCell(value: Int, label: String) -> some View {
        VStack(spacing: 2) {
            Text("\(value)")
                .font(.title3.weight(.semibold))
            Text(label)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Entry Type Chips

    private static let entryTypes: [(id: String, label: String)] = [
        ("note", "Notes"),
        ("quote", "Quotes"),
        ("takeaway", "Takeaways"),
        ("theme", "Themes"),
        ("character", "Characters"),
        ("discussion_prompt", "Discussions"),
    ]

    private var entryTypeChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button {
                    viewModel.selectedEntryTypes = []
                } label: {
                    Text("All")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            Capsule()
                                .fill(viewModel.selectedEntryTypes.isEmpty ? AnyShapeStyle(.tint.opacity(0.18)) : AnyShapeStyle(Color(.secondarySystemFill)))
                        )
                }
                .buttonStyle(.plain)

                ForEach(Self.entryTypes, id: \.id) { type in
                    Button {
                        if viewModel.selectedEntryTypes.contains(type.id) {
                            viewModel.selectedEntryTypes.remove(type.id)
                        } else {
                            viewModel.selectedEntryTypes.insert(type.id)
                        }
                    } label: {
                        Text(type.label)
                            .font(.caption.weight(.medium))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                viewModel.selectedEntryTypes.contains(type.id)
                                    ? AnyShapeStyle(Color.accentColor.opacity(0.18))
                                    : AnyShapeStyle(Color(.secondarySystemFill)),
                                in: Capsule()
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }

    // MARK: - Sort & Filter Header

    private var sortAndFilterHeader: some View {
        HStack {
            Text("\(viewModel.filteredNotes.count) notes")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

            if !viewModel.allTags.isEmpty {
                Button {
                    showTagFilter = true
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "line.3.horizontal.decrease.circle")
                        Text(viewModel.selectedTagIds.isEmpty ? "Tags" : "Tags (\(viewModel.selectedTagIds.count))")
                    }
                    .font(.subheadline)
                    .foregroundStyle(.tint)
                }
            }

            Menu {
                Picker("Sort", selection: $viewModel.sortMode) {
                    ForEach(NotesSortMode.allCases) { mode in
                        Text(mode.rawValue).tag(mode)
                    }
                }
            } label: {
                Label(viewModel.sortMode.rawValue, systemImage: "arrow.up.arrow.down")
                    .font(.subheadline)
                    .foregroundStyle(.tint)
            }
        }
        .padding(.horizontal)
    }

    // MARK: - Flat Notes List

    private var flatNotesList: some View {
        LazyVStack(spacing: 10) {
            ForEach(viewModel.filteredNotes) { note in
                CrossBookNoteRow(
                    note: note,
                    showBookContext: true,
                    onTapNote: { previewNote = note },
                    onEdit: { editNote(note) },
                    onDelete: { Task { await viewModel.deleteNote(noteId: note._id) } }
                )
            }
        }
    }

    // MARK: - Grouped By Book

    private var groupedByBookContent: some View {
        LazyVStack(alignment: .leading, spacing: 16) {
            ForEach(viewModel.groupedByBook, id: \.book._id) { group in
                VStack(alignment: .leading, spacing: 8) {
                    // Section header
                    HStack(spacing: 10) {
                        BookCoverView(r2Key: group.book.coverImageR2Key, displayMode: .square(40))
                            .clipShape(RoundedRectangle(cornerRadius: 6))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(group.book.title)
                                .font(.subheadline.weight(.semibold))
                                .lineLimit(1)
                            if let author = group.book.primaryAuthorName {
                                Text(author)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }

                        Spacer()

                        Text("\(group.notes.count)")
                            .font(.caption.weight(.medium))
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal)

                    ForEach(group.notes) { note in
                        CrossBookNoteRow(
                            note: note,
                            showBookContext: false,
                            onTapNote: { previewNote = note },
                            onEdit: { editNote(note) },
                            onDelete: { Task { await viewModel.deleteNote(noteId: note._id) } }
                        )
                    }
                }
            }
        }
    }

}

// MARK: - Sheet Modifier

/// Extracted to a separate modifier to avoid "unable to type-check this expression"
/// errors in the main `body` — Swift's type checker struggles with many chained `.sheet` calls.
private struct NoteSheetsModifier: ViewModifier {
    @Bindable var viewModel: NotesTabViewModel
    @Binding var showBookPicker: Bool
    @Binding var selectedBookForNewNote: BookWithDetails?
    @Binding var showComposerForSelectedBook: Bool
    @Binding var previewNote: CrossBookNote?
    @Binding var editingNote: CrossBookNote?
    @Binding var audioNoteEditContext: (context: BookNoteComposerContext, note: CrossBookNote)?
    @Binding var showTagFilter: Bool
    var pushDestination: PushDestinationAction

    func body(content: Content) -> some View {
        content
            .sheet(isPresented: $showBookPicker, onDismiss: {
                if selectedBookForNewNote != nil {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        showComposerForSelectedBook = true
                    }
                }
            }) {
                BookPickerSheet { book in
                    selectedBookForNewNote = book
                }
            }
            .sheet(isPresented: $showComposerForSelectedBook, onDismiss: {
                selectedBookForNewNote = nil
            }) {
                if let book = selectedBookForNewNote {
                    FreeformNoteComposerSheet(
                        bookId: book._id,
                        tags: viewModel.allTags,
                        onSave: { noteText, entryType, sourceText, tagIds, isPublic in
                            try await viewModel.createNote(
                                bookId: book._id,
                                noteText: noteText,
                                entryType: entryType,
                                sourceText: sourceText,
                                tagIds: tagIds,
                                isPublic: isPublic
                            )
                        },
                        onCreateTag: { name in
                            try await viewModel.createTag(name: name)
                        }
                    )
                }
            }
            .sheet(item: $previewNote) { note in
                BookNotePreviewSheet(
                    note: note.asBookNote,
                    bookTitle: note.book.title,
                    bookCoverR2Key: note.book.coverImageR2Key,
                    bookAuthorName: note.book.primaryAuthorName,
                    onNavigateToBook: {
                        pushDestination(.book(id: note.bookId))
                    }
                )
            }
            .sheet(item: $editingNote) { note in
                FreeformNoteComposerSheet(
                    bookId: note.bookId,
                    tags: viewModel.allTags,
                    existingNote: note.asBookNote,
                    onSave: { noteText, entryType, sourceText, tagIds, isPublic in
                        try await viewModel.updateNote(
                            noteId: note._id,
                            noteText: noteText,
                            entryType: entryType,
                            sourceText: sourceText,
                            tagIds: tagIds,
                            isPublic: isPublic
                        )
                    },
                    onCreateTag: { name in
                        try await viewModel.createTag(name: name)
                    }
                )
            }
            .sheet(isPresented: Binding(
                get: { audioNoteEditContext != nil },
                set: { if !$0 { audioNoteEditContext = nil } }
            )) {
                if let (context, note) = audioNoteEditContext {
                    BookNoteComposerSheet(
                        context: context,
                        tags: viewModel.allTags,
                        onSave: { payload in
                            try await viewModel.updateNote(
                                noteId: note._id,
                                audioFileId: payload.audioFileId,
                                tagIds: payload.tagIds.isEmpty ? nil : payload.tagIds,
                                startSeconds: payload.startSeconds,
                                endSeconds: payload.endSeconds,
                                noteText: payload.noteText
                            )
                        },
                        onCreateTag: { name in
                            try await viewModel.createTag(name: name)
                        }
                    )
                }
            }
            .sheet(isPresented: $showTagFilter) {
                TagFilterSheet(
                    tags: viewModel.allTags,
                    selectedTagIds: $viewModel.selectedTagIds
                )
            }
    }
}

private extension View {
    func noteSheets(
        viewModel: NotesTabViewModel,
        showBookPicker: Binding<Bool>,
        selectedBookForNewNote: Binding<BookWithDetails?>,
        showComposerForSelectedBook: Binding<Bool>,
        previewNote: Binding<CrossBookNote?>,
        editingNote: Binding<CrossBookNote?>,
        audioNoteEditContext: Binding<(context: BookNoteComposerContext, note: CrossBookNote)?>,
        showTagFilter: Binding<Bool>,
        pushDestination: PushDestinationAction
    ) -> some View {
        modifier(NoteSheetsModifier(
            viewModel: viewModel,
            showBookPicker: showBookPicker,
            selectedBookForNewNote: selectedBookForNewNote,
            showComposerForSelectedBook: showComposerForSelectedBook,
            previewNote: previewNote,
            editingNote: editingNote,
            audioNoteEditContext: audioNoteEditContext,
            showTagFilter: showTagFilter,
            pushDestination: pushDestination
        ))
    }
}
