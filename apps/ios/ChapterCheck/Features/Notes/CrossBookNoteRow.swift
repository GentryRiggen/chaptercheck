import SwiftUI

struct CrossBookNoteRow: View {
    let note: CrossBookNote
    let showBookContext: Bool
    let onTapNote: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    @State private var showDeleteConfirmation = false

    init(
        note: CrossBookNote,
        showBookContext: Bool = true,
        onTapNote: @escaping () -> Void,
        onEdit: @escaping () -> Void,
        onDelete: @escaping () -> Void
    ) {
        self.note = note
        self.showBookContext = showBookContext
        self.onTapNote = onTapNote
        self.onEdit = onEdit
        self.onDelete = onDelete
    }

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            if showBookContext {
                BookCoverView(r2Key: note.book.coverImageR2Key, displayMode: .square(40))
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                RoundedRectangle(cornerRadius: 12)
                    .fill(accentColor)
                    .frame(width: 6)
            }

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

                if showBookContext {
                    HStack(spacing: 4) {
                        Text(note.book.title)
                            .fontWeight(.medium)
                        if let author = note.book.primaryAuthorName {
                            Text("·")
                            Text(author)
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                }
            }
        }
        .padding(.horizontal)
        .padding(.vertical, 10)
        .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
        .contentShape(RoundedRectangle(cornerRadius: 18))
        .onTapGesture(perform: onTapNote)
        .contextMenu {
            Button(action: onEdit) {
                Label("Edit", systemImage: "pencil")
            }
            Button(role: .destructive) {
                showDeleteConfirmation = true
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
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

    private var accentColor: Color {
        note.tags?.first?.displayColor ?? .secondary
    }
}
