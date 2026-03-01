import SwiftUI

/// Create or edit a shelf.
///
/// In create mode, `existingShelf` is `nil` and all fields start empty.
/// In edit mode, fields are pre-populated from the existing shelf.
/// The save action calls the appropriate repository mutation and dismisses.
struct ShelfFormSheet: View {
    let existingShelf: ShelfDetail?

    @State private var name: String
    @State private var description: String
    @State private var isOrdered: Bool
    @State private var isPublic: Bool
    @State private var isSaving = false
    @State private var error: String?

    @Environment(\.dismiss) private var dismiss

    private let repository = ShelfRepository()

    private var isEditMode: Bool { existingShelf != nil }
    private var isSaveDisabled: Bool { name.trimmingCharacters(in: .whitespaces).isEmpty || isSaving }

    // MARK: - Init

    init(existingShelf: ShelfDetail? = nil) {
        self.existingShelf = existingShelf
        _name = State(initialValue: existingShelf?.name ?? "")
        _description = State(initialValue: existingShelf?.description ?? "")
        _isOrdered = State(initialValue: existingShelf?.isOrdered ?? false)
        _isPublic = State(initialValue: existingShelf?.isPublic ?? false)
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    TextField("Name", text: $name)
                } header: {
                    Text("Shelf Name")
                } footer: {
                    Text("Required")
                }

                Section {
                    TextEditor(text: $description)
                        .frame(minHeight: 80)
                } header: {
                    Text("Description")
                } footer: {
                    Text("Optional")
                }

                Section {
                    Toggle("Ordered", isOn: $isOrdered)
                    Toggle("Public", isOn: $isPublic)
                } footer: {
                    Text("Ordered shelves maintain book positions. Public shelves are visible to others.")
                }

                if let error {
                    Section {
                        Text(error)
                            .foregroundStyle(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle(isEditMode ? "Edit Shelf" : "New Shelf")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    if isSaving {
                        ProgressView()
                    } else {
                        Button("Save") {
                            Task { await save() }
                        }
                        .fontWeight(.semibold)
                        .disabled(isSaveDisabled)
                    }
                }
            }
        }
    }

    // MARK: - Save

    private func save() async {
        let trimmedName = name.trimmingCharacters(in: .whitespaces)
        let trimmedDescription = description.trimmingCharacters(in: .whitespaces)

        isSaving = true
        error = nil

        do {
            Haptics.medium()
            if let existing = existingShelf {
                try await repository.updateShelf(
                    shelfId: existing._id,
                    name: trimmedName,
                    description: trimmedDescription.isEmpty ? nil : trimmedDescription,
                    isOrdered: isOrdered,
                    isPublic: isPublic
                )
            } else {
                try await repository.createShelf(
                    name: trimmedName,
                    description: trimmedDescription.isEmpty ? nil : trimmedDescription,
                    isOrdered: isOrdered,
                    isPublic: isPublic
                )
            }
            dismiss()
        } catch {
            self.error = error.localizedDescription
            isSaving = false
        }
    }
}
