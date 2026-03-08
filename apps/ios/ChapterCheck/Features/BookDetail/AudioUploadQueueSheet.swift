import SwiftUI

struct AudioUploadQueueSheet: View {
    let bookId: String
    let initialItems: [AudioUploadQueueItem]
    let onFinished: () -> Void

    @Environment(\.dismiss) private var dismiss

    @State private var items: [AudioUploadQueueItem]
    @State private var isUploading = false
    @State private var hasStartedUpload = false
    @State private var errorMessage: String?

    private let repository = AudioUploadRepository()
    private let basePartNumber: Int

    init(
        bookId: String,
        initialItems: [AudioUploadQueueItem],
        onFinished: @escaping () -> Void
    ) {
        self.bookId = bookId
        self.initialItems = initialItems
        self.onFinished = onFinished
        self.basePartNumber = initialItems.map(\.partNumber).min() ?? 1
        _items = State(initialValue: initialItems)
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 10) {
                        HStack(alignment: .firstTextBaseline) {
                            VStack(alignment: .leading, spacing: 4) {
                                Text("Upload Queue")
                                    .font(.headline)

                                Text(summaryText)
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            if isUploading {
                                ProgressView(value: overallProgress)
                                    .frame(width: 72)
                            } else if allUploadsFinished {
                                Label("Complete", systemImage: "checkmark.circle.fill")
                                    .font(.caption)
                                    .foregroundStyle(.green)
                            }
                        }

                        if hasStartedUpload {
                            Text("Uploads run one file at a time so progress and failures stay easy to track.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        } else {
                            Text("Drag to reorder before uploading. Queue order controls the default part numbering.")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }

                if let errorMessage {
                    Section {
                        Text(errorMessage)
                            .font(.callout)
                            .foregroundStyle(.red)
                    }
                }

                Section {
                    ForEach($items) { $item in
                        uploadRow(item: $item)
                    }
                    .onMove { source, destination in
                        guard !hasStartedUpload else { return }
                        items.move(fromOffsets: source, toOffset: destination)
                        resequencePartNumbers()
                    }
                    .onDelete { offsets in
                        guard !hasStartedUpload else { return }
                        items.remove(atOffsets: offsets)
                        resequencePartNumbers()
                    }
                } header: {
                    Text("Files")
                } footer: {
                    if !hasStartedUpload {
                        Text("Chapter number and chapter title are optional.")
                    }
                }
            }
            .navigationTitle("Upload Audio")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button(isUploading ? "Uploading..." : "Cancel") {
                        dismiss()
                    }
                    .disabled(isUploading)
                }

                if !hasStartedUpload {
                    ToolbarItem(placement: .topBarTrailing) {
                        EditButton()
                            .disabled(isUploading || items.isEmpty)
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button(allUploadsFinished ? "Done" : "Upload") {
                        if allUploadsFinished {
                            onFinished()
                            dismiss()
                        } else {
                            Task { await startUpload() }
                        }
                    }
                    .disabled(uploadButtonDisabled)
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .interactiveDismissDisabled(isUploading)
    }

    @ViewBuilder
    private func uploadRow(item: Binding<AudioUploadQueueItem>) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Part \(item.wrappedValue.partNumber)")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.tint)

                    Text(item.wrappedValue.fileName)
                        .font(.body)
                        .lineLimit(2)

                    HStack(spacing: 6) {
                        Text(item.wrappedValue.formattedFileSize)
                        Text("•")
                        Text(item.wrappedValue.formattedDuration)
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }

                Spacer()

                statusBadge(for: item.wrappedValue)
            }

            if item.wrappedValue.status == .uploading || item.wrappedValue.status == .uploaded {
                ProgressView(value: item.wrappedValue.status == .uploaded ? 1 : item.wrappedValue.progress)
            }

            if let errorMessage = item.wrappedValue.errorMessage {
                Text(errorMessage)
                    .font(.caption)
                    .foregroundStyle(.red)
            }

            if !hasStartedUpload {
                VStack(alignment: .leading, spacing: 10) {
                    TextField("Chapter number (optional)", text: item.chapterNumberText)
                        .keyboardType(.numberPad)

                    TextField("Chapter title (optional)", text: item.chapterTitle)
                }
                .textFieldStyle(.roundedBorder)
            }
        }
        .padding(.vertical, 6)
    }

    @ViewBuilder
    private func statusBadge(for item: AudioUploadQueueItem) -> some View {
        switch item.status {
        case .pending:
            Label("Queued", systemImage: "clock")
                .font(.caption)
                .foregroundStyle(.secondary)
        case .uploading:
            Label("\(Int(item.progress * 100))%", systemImage: "arrow.up.circle.fill")
                .font(.caption)
                .foregroundStyle(.tint)
        case .uploaded:
            Label("Uploaded", systemImage: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(.green)
        case .failed:
            Label("Failed", systemImage: "exclamationmark.triangle.fill")
                .font(.caption)
                .foregroundStyle(.orange)
        }
    }

    private var summaryText: String {
        let uploaded = items.filter { $0.status == .uploaded }.count
        if uploaded > 0 {
            return "\(uploaded) of \(items.count) uploaded"
        }
        return "\(items.count) file\(items.count == 1 ? "" : "s") selected"
    }

    private var overallProgress: Double {
        guard !items.isEmpty else { return 0 }
        let total = items.reduce(0.0) { partial, item in
            switch item.status {
            case .uploaded:
                return partial + 1
            case .uploading:
                return partial + item.progress
            case .pending, .failed:
                return partial
            }
        }
        return total / Double(items.count)
    }

    private var allUploadsFinished: Bool {
        !items.isEmpty && items.allSatisfy { $0.status == .uploaded }
    }

    private var uploadButtonDisabled: Bool {
        isUploading || items.isEmpty
    }

    private func resequencePartNumbers() {
        for index in items.indices {
            items[index].partNumber = basePartNumber + index
        }
    }

    @MainActor
    private func startUpload() async {
        guard !isUploading else { return }
        isUploading = true
        hasStartedUpload = true
        errorMessage = nil

        for index in items.indices {
            guard items[index].status != .uploaded else { continue }

            let itemId = items[index].id
            items[index].status = .uploading
            items[index].progress = 0
            items[index].errorMessage = nil

            do {
                try await repository.uploadAudioFile(bookId: bookId, item: items[index]) { progress in
                    if let currentIndex = items.firstIndex(where: { $0.id == itemId }) {
                        items[currentIndex].progress = progress
                    }
                }
                items[index].status = .uploaded
                items[index].progress = 1
                Haptics.selection()
            } catch {
                items[index].status = .failed
                items[index].errorMessage = error.localizedDescription
                errorMessage = "Some files failed to upload. You can retry the remaining items."
            }
        }

        isUploading = false

        if allUploadsFinished {
            Haptics.success()
        }
    }
}
