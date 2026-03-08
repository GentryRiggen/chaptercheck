import SwiftUI

struct BookNotesListView: View {
    let notes: [BookNote]
    let categories: [NoteCategory]
    @Binding var selectedCategoryId: String?
    @Binding var filterOption: BookNotesFilterOption
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
                    description: Text("Capture moments from the player, then revisit them here.")
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

            Menu {
                Picker("Sort", selection: $filterOption) {
                    ForEach(BookNotesFilterOption.allCases) { option in
                        Text(option.label).tag(option)
                    }
                }
            } label: {
                Label("Sort", systemImage: "arrow.up.arrow.down")
                    .font(.subheadline)
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
                    selectedCategoryId = nil
                } label: {
                    Text("All Categories")
                        .font(.caption.weight(.medium))
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(
                            Capsule()
                                .fill(selectedCategoryId == nil ? AnyShapeStyle(.tint.opacity(0.18)) : AnyShapeStyle(Color(.secondarySystemFill)))
                        )
                }
                .buttonStyle(.plain)

                ForEach(categories) { category in
                    Button {
                        selectedCategoryId = category._id
                    } label: {
                        HStack(spacing: 6) {
                            Circle()
                                .fill(AccentColorToken.color(for: category.colorToken))
                                .frame(width: 8, height: 8)
                            Text(category.name)
                                .font(.caption.weight(.medium))
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 8)
                        .background(selectedCategoryId == category._id ? AccentColorToken.color(for: category.colorToken).opacity(0.18) : Color(.secondarySystemFill), in: Capsule())
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal)
        }
    }
}

private struct BookNoteRow: View {
    let note: BookNote
    let onPlay: () -> Void
    let onEdit: () -> Void
    let onDelete: () -> Void

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            RoundedRectangle(cornerRadius: 12)
                .fill(categoryColor)
                .frame(width: 6)

            VStack(alignment: .leading, spacing: 6) {
                HStack {
                    if let category = note.category {
                        Text(category.name)
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(categoryColor)
                    } else {
                        Text("Uncategorized")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(.secondary)
                    }
                    Spacer()
                    Text(TimeFormatting.formatRelativeDate(note.updatedAt))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                }

                if let noteText = note.noteText, !noteText.isEmpty {
                    Text(noteText)
                        .font(.subheadline)
                        .foregroundStyle(.primary)
                        .multilineTextAlignment(.leading)
                        .lineLimit(3)
                }

                HStack(spacing: 6) {
                    Text(note.audioFile.displayName)
                    Text("·")
                    Text(note.formattedRange)
                    Text("·")
                    Text(note.formattedDuration)
                }
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
            }

            Menu {
                Button("Edit", action: onEdit)
                Button("Delete", role: .destructive, action: onDelete)
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
        .padding(.horizontal)
    }

    private var categoryColor: Color {
        guard let category = note.category else { return .secondary }
        return AccentColorToken.color(for: category.colorToken)
    }
}
