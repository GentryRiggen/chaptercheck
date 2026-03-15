import SwiftUI

struct NotesTabView: View {
    @State private var viewModel = NotesTabViewModel()
    @State private var showBookPicker = false
    @State private var selectedBookForNewNote: BookWithDetails?
    @State private var previewNote: BookNote?
    @State private var editingNote: CrossBookNote?
    @State private var showComposerForSelectedBook = false

    private let networkMonitor = NetworkMonitor.shared

    var body: some View {
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
        .sheet(isPresented: $showBookPicker, onDismiss: {
            // Delay to let SwiftUI finish the dismiss animation before presenting the next sheet
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
            BookNotePreviewSheet(note: note)
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
                tagFilterChips
                sortHeader

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

    // MARK: - Tag Filter Chips

    private var tagFilterChips: some View {
        Group {
            if !viewModel.allTags.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        Button {
                            viewModel.selectedTagIds = []
                        } label: {
                            Text("All Tags")
                                .font(.caption.weight(.medium))
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(
                                    Capsule()
                                        .fill(viewModel.selectedTagIds.isEmpty ? AnyShapeStyle(.tint.opacity(0.18)) : AnyShapeStyle(Color(.secondarySystemFill)))
                                )
                        }
                        .buttonStyle(.plain)

                        ForEach(viewModel.allTags) { tag in
                            Button {
                                if viewModel.selectedTagIds.contains(tag._id) {
                                    viewModel.selectedTagIds.remove(tag._id)
                                } else {
                                    viewModel.selectedTagIds.insert(tag._id)
                                }
                            } label: {
                                HStack(spacing: 6) {
                                    Circle()
                                        .fill(tag.displayColor)
                                        .frame(width: 8, height: 8)
                                    Text(tag.name)
                                        .font(.caption.weight(.medium))
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .background(
                                    viewModel.selectedTagIds.contains(tag._id)
                                        ? tag.displayColor.opacity(0.18)
                                        : Color(.secondarySystemFill),
                                    in: Capsule()
                                )
                            }
                            .buttonStyle(.plain)
                        }
                    }
                    .padding(.horizontal)
                }
            }
        }
    }

    // MARK: - Sort Header

    private var sortHeader: some View {
        HStack {
            Text("\(viewModel.filteredNotes.count) notes")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Spacer()

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
                    onTapNote: { previewNote = note.asBookNote },
                    onEdit: { editingNote = note },
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
                    NavigationLink(value: AppDestination.book(id: group.book._id)) {
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

                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundStyle(.tertiary)
                        }
                    }
                    .buttonStyle(.plain)
                    .padding(.horizontal)

                    ForEach(group.notes) { note in
                        CrossBookNoteRow(
                            note: note,
                            showBookContext: false,
                            onTapNote: { previewNote = note.asBookNote },
                            onEdit: { editingNote = note },
                            onDelete: { Task { await viewModel.deleteNote(noteId: note._id) } }
                        )
                    }
                }
            }
        }
    }

}
