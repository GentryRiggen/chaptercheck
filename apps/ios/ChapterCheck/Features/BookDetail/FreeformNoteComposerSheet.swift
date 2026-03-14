import SwiftUI

struct FreeformNoteComposerSheet: View {
    let bookId: String
    let tags: [MemoryTag]
    let existingNote: BookNote?
    let onSave: (_ noteText: String, _ entryType: String, _ sourceText: String?, _ tagIds: [String]) async throws -> Void
    let onCreateTag: (_ name: String) async throws -> String

    @Environment(\.dismiss) private var dismiss

    @State private var noteText: String
    @State private var selectedEntryType: String
    @State private var sourceText: String
    @State private var selectedTagIds: Set<String>
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var newTagName = ""
    @State private var isCreatingTag = false

    private static let entryTypes: [(id: String, label: String, icon: String)] = [
        ("note", "Note", "note.text"),
        ("quote", "Quote", "quote.opening"),
        ("takeaway", "Takeaway", "lightbulb"),
        ("theme", "Theme", "paintpalette"),
        ("character", "Character", "person"),
        ("discussion_prompt", "Discussion", "bubble.left.and.bubble.right"),
    ]

    init(
        bookId: String,
        tags: [MemoryTag],
        existingNote: BookNote? = nil,
        onSave: @escaping (_ noteText: String, _ entryType: String, _ sourceText: String?, _ tagIds: [String]) async throws -> Void,
        onCreateTag: @escaping (_ name: String) async throws -> String
    ) {
        self.bookId = bookId
        self.tags = tags
        self.existingNote = existingNote
        self.onSave = onSave
        self.onCreateTag = onCreateTag

        _noteText = State(initialValue: existingNote?.noteText ?? "")
        _selectedEntryType = State(initialValue: existingNote?.entryType ?? "note")
        _sourceText = State(initialValue: existingNote?.sourceText ?? "")
        _selectedTagIds = State(initialValue: Set(existingNote?.tags?.map(\._id) ?? []))
    }

    private var canSave: Bool {
        !noteText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    entryTypeSection
                    noteTextSection
                    if selectedEntryType == "quote" {
                        sourceTextSection
                    }
                    tagSection
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .navigationTitle(existingNote == nil ? "Add Note" : "Edit Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(existingNote == nil ? "Save" : "Update") {
                        Task { await save() }
                    }
                    .disabled(isSaving || !canSave)
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Sections

    private var entryTypeSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Type")
                .font(.headline)

            FlowLayout(spacing: 8) {
                ForEach(Self.entryTypes, id: \.id) { type in
                    Button {
                        selectedEntryType = type.id
                    } label: {
                        Label(type.label, systemImage: type.icon)
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 999)
                                    .fill(selectedEntryType == type.id ? Color.accentColor.opacity(0.18) : Color(.secondarySystemFill))
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 999)
                                    .stroke(selectedEntryType == type.id ? Color.accentColor : .clear, lineWidth: 1.5)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var noteTextSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(selectedEntryType == "quote" ? "Your thoughts" : "Note")
                .font(.headline)

            TextEditor(text: $noteText)
                .frame(minHeight: 100, maxHeight: 200)
                .padding(8)
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color(.separator), lineWidth: 0.5)
                )
        }
    }

    private var sourceTextSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Quote text")
                .font(.headline)

            TextField("Paste or type the quote...", text: $sourceText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(3...6)
        }
    }

    private var tagSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Tags")
                .font(.headline)

            if tags.isEmpty {
                Text("Create your first tag below.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            } else {
                FlowLayout(spacing: 8) {
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
                                    .frame(width: 10, height: 10)
                                Text(tag.name)
                                    .lineLimit(1)
                            }
                            .font(.subheadline)
                            .padding(.horizontal, 12)
                            .padding(.vertical, 8)
                            .background(
                                RoundedRectangle(cornerRadius: 999)
                                    .fill(selectedTagIds.contains(tag._id) ? tag.displayColor.opacity(0.18) : Color(.secondarySystemFill))
                            )
                            .overlay(
                                RoundedRectangle(cornerRadius: 999)
                                    .stroke(selectedTagIds.contains(tag._id) ? tag.displayColor : .clear, lineWidth: 1.5)
                            )
                        }
                        .buttonStyle(.plain)
                    }
                }
            }

            VStack(alignment: .leading, spacing: 10) {
                HStack {
                    TextField("New tag name", text: $newTagName)
                        .textFieldStyle(.roundedBorder)

                    Button {
                        Task { await createTag() }
                    } label: {
                        Label("Create", systemImage: "plus")
                    }
                    .buttonStyle(.borderedProminent)
                    .buttonBorderShape(.capsule)
                    .disabled(isCreatingTag || newTagName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                }
            }
            .padding()
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 16))
        }
    }

    // MARK: - Actions

    private func createTag() async {
        isCreatingTag = true
        defer { isCreatingTag = false }

        do {
            let newId = try await onCreateTag(
                newTagName.trimmingCharacters(in: .whitespacesAndNewlines)
            )
            selectedTagIds.insert(newId)
            newTagName = ""
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func save() async {
        errorMessage = nil
        isSaving = true
        defer { isSaving = false }

        let trimmedNote = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedSource = sourceText.trimmingCharacters(in: .whitespacesAndNewlines)

        do {
            try await onSave(
                trimmedNote,
                selectedEntryType,
                trimmedSource.isEmpty ? nil : trimmedSource,
                Array(selectedTagIds)
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}
