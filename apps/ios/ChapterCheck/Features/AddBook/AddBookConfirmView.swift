import SwiftUI

/// Confirmation screen showing pre-filled book details before adding to library.
struct AddBookConfirmView: View {
    @State private var viewModel: AddBookConfirmViewModel

    var onBookCreated: (String) -> Void

    init(suggestion: OpenLibraryBookSuggestion, onBookCreated: @escaping (String) -> Void) {
        self._viewModel = State(initialValue: AddBookConfirmViewModel(suggestion: suggestion))
        self.onBookCreated = onBookCreated
    }

    var body: some View {
        Form {
            // Cover preview
            if let coverUrl = viewModel.suggestion.coverUrl, let url = URL(string: coverUrl) {
                Section {
                    HStack {
                        Spacer()
                        AsyncImage(url: url) { phase in
                            switch phase {
                            case .success(let image):
                                image
                                    .resizable()
                                    .aspectRatio(contentMode: .fit)
                                    .frame(maxHeight: 200)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                            default:
                                RoundedRectangle(cornerRadius: 8)
                                    .fill(.fill.tertiary)
                                    .frame(width: 130, height: 200)
                                    .overlay {
                                        ProgressView()
                                    }
                            }
                        }
                        Spacer()
                    }
                }
                .listRowBackground(Color.clear)
            }

            // Editable details
            Section("Details") {
                TextField("Title", text: $viewModel.title)
                TextField("Subtitle", text: $viewModel.subtitle)
                TextField("ISBN", text: $viewModel.isbn)
                TextField("Published Year", text: $viewModel.publishedYear)
                    .keyboardType(.numberPad)
                TextField("Language", text: $viewModel.language)
            }

            Section("Description") {
                TextField("Description", text: $viewModel.description, axis: .vertical)
                    .lineLimit(3...8)
            }

            // Authors (read-only from OL)
            if !viewModel.suggestion.authors.isEmpty {
                Section("Authors") {
                    ForEach(viewModel.suggestion.authors, id: \.name) { author in
                        Text(author.name)
                    }
                }
            }

            // Duplicate warning
            if let match = viewModel.existingMatch {
                Section {
                    HStack(spacing: 10) {
                        Image(systemName: "exclamationmark.triangle.fill")
                            .foregroundStyle(.orange)
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Possible duplicate")
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Text("\"\(match.title)\" already exists in your library.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            // Reading status picker
            Section("Reading Status") {
                Picker("Status", selection: $viewModel.selectedStatus) {
                    ForEach(ReadingStatus.allCases) { status in
                        Label(status.label, systemImage: status.icon)
                            .tag(status)
                    }
                }
                .pickerStyle(.menu)
            }

            if let error = viewModel.error {
                Section {
                    Text(error)
                        .foregroundStyle(.red)
                        .font(.subheadline)
                }
            }
        }
        .onAppear { viewModel.checkForDuplicate() }
        .navigationTitle("Confirm Book")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .confirmationAction) {
                Button {
                    Task {
                        if let bookId = await viewModel.createBook() {
                            Haptics.success()
                            onBookCreated(bookId)
                        }
                    }
                } label: {
                    if viewModel.isSaving {
                        ProgressView()
                            .controlSize(.small)
                    } else {
                        Text("Add to Library")
                            .fontWeight(.semibold)
                    }
                }
                .disabled(viewModel.title.isEmpty || viewModel.isSaving)
            }
        }
    }
}
