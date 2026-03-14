import SwiftUI

struct CrossBookNoteRow: View {
    let note: CrossBookNote
    let showBookContext: Bool
    let onTapNote: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

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
                NavigationLink(value: AppDestination.book(id: note.book._id)) {
                    BookCoverView(r2Key: note.book.coverImageR2Key, displayMode: .square(40))
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
                .buttonStyle(.plain)
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
                    NavigationLink(value: AppDestination.book(id: note.book._id)) {
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
                    .buttonStyle(.plain)
                }
            }

            Menu {
                Button(action: onEdit) {
                    Label("Edit", systemImage: "pencil")
                }
                Button(role: .destructive, action: onDelete) {
                    Label("Delete", systemImage: "trash")
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
        .onTapGesture(perform: onTapNote)
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
