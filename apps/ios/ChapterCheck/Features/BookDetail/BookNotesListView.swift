import SwiftUI

struct BookNotesListView: View {
    let notes: [BookNote]
    let tags: [MemoryTag]
    @Binding var selectedTagIds: Set<String>
    @Binding var filterOption: BookNotesFilterOption
    let onAddNote: () -> Void
    let onPlayNote: (BookNote) -> Void
    let onEditNote: (BookNote) -> Void
    let onDeleteNote: (BookNote) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            headerRow
            filterChips

            if notes.isEmpty {
                ContentUnavailableView(
                    "No Notes Yet",
                    systemImage: "text.quote",
                    description: Text("Capture moments from the player or add freeform notes.")
                )
                .padding(.horizontal)
            } else {
                ForEach(notes) { note in
                    BookNoteRow(
                        note: note,
                        onPlay: { onPlayNote(note) },
                        onEdit: { onEditNote(note) },
                        onDelete: { onDeleteNote(note) }
                    )
                }
            }
        }
    }

    private var headerRow: some View {
        HStack {
            Text("Notes")
                .font(.headline)

            if !notes.isEmpty {
                Text("\(notes.count)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Button {
                onAddNote()
            } label: {
                Image(systemName: "plus")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.tint)
            }

            Menu {
                Picker("Sort", selection: $filterOption) {
                    ForEach(BookNotesFilterOption.allCases) { option in
                        Text(option.label).tag(option)
                    }
                }
            } label: {
                Label("Sort", systemImage: "arrow.up.arrow.down")
                    .font(.body)
                    .foregroundStyle(.tint)
                    .labelStyle(.iconOnly)
            }
        }
        .padding(.horizontal)
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                Button {
                    selectedTagIds = []
                } label: {
                    Text("All Tags")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            Capsule()
                                .fill(selectedTagIds.isEmpty ? AnyShapeStyle(.tint.opacity(0.18)) : AnyShapeStyle(Color(.secondarySystemFill)))
                        )
                }
                .buttonStyle(.plain)

                ForEach(tags) { tag in
                    Button {
                        if selectedTagIds.contains(tag._id) {
                            selectedTagIds.remove(tag._id)
                        } else {
                            selectedTagIds.insert(tag._id)
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
                        .background(selectedTagIds.contains(tag._id) ? tag.displayColor.opacity(0.18) : Color(.secondarySystemFill), in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }
}

struct BookNoteRow: View {
    let note: BookNote
    let onPlay: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteConfirmation = false

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 12)
                .fill(accentColor)
                .frame(width: 6)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    tagBadges
                    Spacer()
                    Text(TimeFormatting.formatRelativeDate(note.updatedAt))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if let sourceText = note.sourceText, !sourceText.isEmpty {
                    Text("\u{201C}\(sourceText)\u{201D}")
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .italic()
                        .lineLimit(2)
                }

                if let noteText = note.noteText, !noteText.isEmpty {
                    Text(noteText)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(3)
                }

                if note.isAudioAnchored, let audioFile = note.audioFile {
                    HStack(spacing: 6) {
                        Text(audioFile.displayName)
                        Text("·")
                        Text(note.formattedRange)
                        Text("·")
                        Text(note.formattedDuration)
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                }
            }

            Menu {
                Button(action: onEdit) {
                    Label("Edit", systemImage: "pencil")
                }
                Button(role: .destructive) {
                    showDeleteConfirmation = true
                } label: {
                    Label {
                        Text("Delete")
                    } icon: {
                        Image(systemName: "trash")
                            .foregroundStyle(.red)
                    }
                }
            } label: {
                Image(systemName: "ellipsis")
                    .font(.subheadline.weight(.semibold))
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
        .contentShape(RoundedRectangle(cornerRadius: 18))
        .onTapGesture(perform: onPlay)
        .alert("Delete Note", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive, action: onDelete)
        } message: {
            Text("Are you sure you want to delete this note? This action cannot be undone.")
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    private var tagBadges: some View {
        if let noteTags = note.tags, !noteTags.isEmpty {
            HStack(spacing: 4) {
                ForEach(noteTags) { tag in
                    Text(tag.name)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(tag.displayColor)
                }
            }
        } else if !note.isAudioAnchored {
            Label(note.entryTypeLabel, systemImage: note.entryTypeIcon)
                .font(.caption.weight(.semibold))
                .foregroundStyle(.tint)
        } else {
            Text("Untagged")
                .font(.caption.weight(.semibold))
                .foregroundStyle(.secondary)
        }
    }

    /// The accent color used for the left-side indicator bar.
    ///
    /// Uses the first tag's deterministic color if tags exist; falls back to
    /// secondary for notes without tags.
    private var accentColor: Color {
        note.tags?.first?.displayColor ?? .secondary
    }
}
