import SwiftUI

struct BookNoteComposerContext {
    let bookId: String
    let audioFiles: [AudioFile]
    let anchorSeconds: Double
    let initialAudioFileId: String
    let initialStartSeconds: Double
    let initialEndSeconds: Double
    let existingNote: BookNote?
}

struct BookNoteComposerSheet: View {
    let context: BookNoteComposerContext
    let tags: [MemoryTag]
    let onSave: (_ payload: BookNoteSavePayload) async throws -> Void
    let onCreateTag: (_ name: String) async throws -> String

    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(\.dismiss) private var dismiss
    @Environment(DownloadManager.self) private var downloadManager

    @State private var selectedAudioFileId: String
    @State private var noteText: String
    @State private var selectedTagIds: Set<String>
    @State private var startSeconds: Double
    @State private var endSeconds: Double
    @State private var activeHandle: RangeHandle = .end
    @State private var isSaving = false
    @State private var errorMessage: String?
    @State private var newTagName = ""
    @State private var isCreatingTag = false
    @State private var clipPreviewPlayer = ClipPreviewPlayer()
    @State private var isScrubbingPreview = false
    @State private var previewScrubTime: Double = 0

    private static let windowRadiusSeconds: Double = 15 * 60
    private static let maxNoteLengthSeconds: Double = 30 * 60

    init(
        context: BookNoteComposerContext,
        tags: [MemoryTag],
        onSave: @escaping (_ payload: BookNoteSavePayload) async throws -> Void,
        onCreateTag: @escaping (_ name: String) async throws -> String
    ) {
        self.context = context
        self.tags = tags
        self.onSave = onSave
        self.onCreateTag = onCreateTag

        _selectedAudioFileId = State(initialValue: context.initialAudioFileId)
        _noteText = State(initialValue: context.existingNote?.noteText ?? "")
        _selectedTagIds = State(initialValue: Set(context.existingNote?.tags?.map(\._id) ?? []))
        _startSeconds = State(initialValue: context.initialStartSeconds)
        _endSeconds = State(initialValue: context.initialEndSeconds)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    filePickerSection
                    rangeSection
                    previewSection
                    noteTextSection
                    tagSection
                    if let errorMessage {
                        Text(errorMessage)
                            .font(.footnote)
                            .foregroundStyle(.red)
                    }
                }
                .padding()
            }
            .navigationTitle(context.existingNote == nil ? "Add Note" : "Edit Note")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button(context.existingNote == nil ? "Save" : "Update") {
                        Task { await save() }
                    }
                    .disabled(isSaving || !canSave)
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
        .onAppear {
            if context.existingNote == nil, audioPlayer.isPlaying {
                audioPlayer.pause()
            }
        }
        .onDisappear {
            clipPreviewPlayer.stop()
        }
        .onChange(of: selectedAudioFileId) { _, _ in
            clipPreviewPlayer.stop()
        }
        .onChange(of: startSeconds) { _, _ in
            clipPreviewPlayer.stop()
        }
        .onChange(of: endSeconds) { _, _ in
            clipPreviewPlayer.stop()
        }
    }

    private var selectedAudioFile: AudioFile? {
        context.audioFiles.first(where: { $0._id == selectedAudioFileId })
    }

    private var maxDuration: Double {
        guard let duration = selectedAudioFile?.duration, duration > 0 else {
            return max(endSeconds, startSeconds + 1, 60)
        }
        return duration
    }

    private var windowStart: Double {
        max(0, context.anchorSeconds - Self.windowRadiusSeconds)
    }

    private var windowEnd: Double {
        min(maxDuration, context.anchorSeconds + Self.windowRadiusSeconds)
    }

    private var windowLength: Double {
        max(windowEnd - windowStart, 1)
    }

    private var canSave: Bool {
        startSeconds < endSeconds &&
        selectedAudioFile != nil
    }

    private var previewDuration: Double {
        max(endSeconds - startSeconds, 0)
    }

    private var previewDisplayedTime: Double {
        isScrubbingPreview ? previewScrubTime : clipPreviewPlayer.currentTime
    }

    private var filePickerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Moment")
                .font(.headline)

            if context.audioFiles.count > 1 {
                Picker("Audio File", selection: $selectedAudioFileId) {
                    ForEach(context.audioFiles) { file in
                        Text(file.displayName ?? file.fileName).tag(file._id)
                    }
                }
                .pickerStyle(.menu)
                .onChange(of: selectedAudioFileId) { _, _ in
                    clampRange()
                }
            } else if let selectedAudioFile {
                Text(selectedAudioFile.displayName ?? selectedAudioFile.fileName)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var rangeSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Range")
                    .font(.headline)
                Spacer()
                Text("\(TimeFormatting.formatTime(startSeconds)) - \(TimeFormatting.formatTime(endSeconds))")
                    .font(.subheadline)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }

            Text("Length \(TimeFormatting.formatDuration(endSeconds - startSeconds))")
                .font(.caption)
                .foregroundStyle(.secondary)

            DualHandleRangeSlider(
                startSeconds: $startSeconds,
                endSeconds: $endSeconds,
                windowStart: windowStart,
                windowEnd: windowEnd,
                maxLength: Self.maxNoteLengthSeconds,
                activeHandle: $activeHandle
            )
            .frame(height: 44)

            HStack(spacing: 12) {
                quickAdjustButton(title: "-15", delta: -15)
                quickAdjustButton(title: "-5", delta: -5)
                Text(activeHandle == .start ? "Adjusting start" : "Adjusting end")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
                quickAdjustButton(title: "+5", delta: 5)
                quickAdjustButton(title: "+15", delta: 15)
            }
        }
    }

    private var previewSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            HStack {
                Text("Preview")
                    .font(.headline)

                Spacer()

                Text("\(TimeFormatting.formatTime(previewDisplayedTime)) / \(TimeFormatting.formatTime(previewDuration))")
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }

            VStack(spacing: 6) {
                Slider(
                    value: Binding(
                        get: { previewDisplayedTime },
                        set: { previewScrubTime = $0 }
                    ),
                    in: 0...max(previewDuration, 1),
                    onEditingChanged: handlePreviewScrub
                )
                .disabled(selectedAudioFile == nil || clipPreviewPlayer.isLoading || previewDuration <= 0)
                .tint(.accentColor)

                HStack {
                    Text(TimeFormatting.formatTime(previewDisplayedTime))
                        .font(.caption)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)

                    Spacer()

                    Text("-\(TimeFormatting.formatTime(max(previewDuration - previewDisplayedTime, 0)))")
                        .font(.caption)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }

            HStack(spacing: 16) {
                Spacer()

                previewTransportButton(systemName: "gobackward.15") {
                    clipPreviewPlayer.skip(by: -15)
                }

                Button {
                    Task { await togglePreview() }
                } label: {
                    Group {
                        if clipPreviewPlayer.isLoading {
                            ProgressView()
                                .controlSize(.small)
                                .frame(width: 42, height: 42)
                        } else {
                            Image(systemName: clipPreviewPlayer.isPlaying ? "pause.fill" : "play.fill")
                                .font(.title3.weight(.semibold))
                                .frame(width: 42, height: 42)
                        }
                    }
                }
                .buttonStyle(.borderedProminent)
                .buttonBorderShape(.circle)
                .disabled(selectedAudioFile == nil || clipPreviewPlayer.isLoading)

                previewTransportButton(systemName: "goforward.15") {
                    clipPreviewPlayer.skip(by: 15)
                }

                Spacer()
            }

            Text("Preview uses a separate player and does not change your current listening position.")
                .font(.caption)
                .foregroundStyle(.secondary)

            if let previewError = clipPreviewPlayer.errorMessage {
                Text(previewError)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
    }

    private var noteTextSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Note")
                .font(.headline)

            TextField("What stood out here?", text: $noteText, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .lineLimit(3...6)
        }
    }

    private var tagSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Tags")
                .font(.headline)

            if !tags.isEmpty {
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

    private func quickAdjustButton(title: String, delta: Double) -> some View {
        Button(title) {
            adjustActiveHandle(by: delta)
        }
        .buttonStyle(.bordered)
    }

    private func previewTransportButton(systemName: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: systemName)
                .font(.title3.weight(.medium))
                .frame(width: 42, height: 42)
        }
        .buttonStyle(.bordered)
        .buttonBorderShape(.circle)
        .disabled(selectedAudioFile == nil || clipPreviewPlayer.isLoading)
    }

    private func handlePreviewScrub(isEditing: Bool) {
        if isEditing {
            isScrubbingPreview = true
            previewScrubTime = clipPreviewPlayer.currentTime
            return
        }

        isScrubbingPreview = false
        clipPreviewPlayer.seek(toRelativeSeconds: previewScrubTime)
    }

    private func adjustActiveHandle(by delta: Double) {
        switch activeHandle {
        case .start:
            startSeconds = min(max(windowStart, startSeconds + delta), endSeconds - 1)
            if endSeconds - startSeconds > Self.maxNoteLengthSeconds {
                endSeconds = min(windowEnd, startSeconds + Self.maxNoteLengthSeconds)
            }
        case .end:
            endSeconds = max(min(windowEnd, endSeconds + delta), startSeconds + 1)
            if endSeconds - startSeconds > Self.maxNoteLengthSeconds {
                startSeconds = max(windowStart, endSeconds - Self.maxNoteLengthSeconds)
            }
        }
    }

    private func clampRange() {
        startSeconds = min(max(windowStart, startSeconds), max(windowEnd - 1, windowStart))
        endSeconds = min(max(startSeconds + 1, endSeconds), windowEnd)
        if endSeconds - startSeconds > Self.maxNoteLengthSeconds {
            endSeconds = min(windowEnd, startSeconds + Self.maxNoteLengthSeconds)
        }
    }

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

        do {
            try await onSave(
                BookNoteSavePayload(
                    noteId: context.existingNote?._id,
                    audioFileId: selectedAudioFileId,
                    tagIds: Array(selectedTagIds),
                    startSeconds: startSeconds,
                    endSeconds: endSeconds,
                    noteText: {
                        let trimmed = noteText.trimmingCharacters(in: .whitespacesAndNewlines)
                        return trimmed.isEmpty ? nil : trimmed
                    }()
                )
            )
            dismiss()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private func togglePreview() async {
        guard let selectedAudioFile else { return }

        if clipPreviewPlayer.isPlaying {
            clipPreviewPlayer.pause()
            return
        }

        let localFileURL = await downloadManager.localFileURL(for: selectedAudioFile._id)
        await clipPreviewPlayer.playClip(
            audioFileId: selectedAudioFile._id,
            localFileURL: localFileURL,
            startSeconds: startSeconds,
            endSeconds: endSeconds
        )
    }

}

struct BookNoteSavePayload {
    let noteId: String?
    let audioFileId: String
    let tagIds: [String]
    let startSeconds: Double
    let endSeconds: Double
    let noteText: String?
}

private enum RangeHandle {
    case start
    case end
}

private struct DualHandleRangeSlider: View {
    @Binding var startSeconds: Double
    @Binding var endSeconds: Double
    let windowStart: Double
    let windowEnd: Double
    let maxLength: Double
    @Binding var activeHandle: RangeHandle

    var body: some View {
        GeometryReader { geometry in
            let width = max(geometry.size.width, 1)
            let windowLength = max(windowEnd - windowStart, 1)
            let startX = CGFloat((startSeconds - windowStart) / windowLength) * width
            let endX = CGFloat((endSeconds - windowStart) / windowLength) * width

            ZStack(alignment: .leading) {
                Capsule()
                    .fill(.fill.tertiary)
                    .frame(height: 6)

                Capsule()
                    .fill(.tint)
                    .frame(width: max(endX - startX, 8), height: 8)
                    .offset(x: startX)

                handle(at: startX, selected: activeHandle == .start)
                    .gesture(dragGesture(for: .start, width: width))

                handle(at: endX, selected: activeHandle == .end)
                    .gesture(dragGesture(for: .end, width: width))
            }
            .frame(height: 44)
        }
    }

    private func handle(at x: CGFloat, selected: Bool) -> some View {
        Circle()
            .fill(.background)
            .frame(width: selected ? 24 : 20, height: selected ? 24 : 20)
            .overlay(Circle().stroke(.tint, lineWidth: 3))
            .shadow(color: .black.opacity(0.12), radius: 4, y: 2)
            .offset(x: x - (selected ? 12 : 10))
    }

    private func dragGesture(for handle: RangeHandle, width: CGFloat) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                activeHandle = handle
                let windowLength = max(windowEnd - windowStart, 1)
                let rawValue = windowStart + max(0, min(Double(value.location.x / width) * windowLength, windowLength))
                switch handle {
                case .start:
                    startSeconds = min(rawValue, endSeconds - 1)
                    if endSeconds - startSeconds > maxLength {
                        endSeconds = min(windowEnd, startSeconds + maxLength)
                    }
                case .end:
                    endSeconds = max(rawValue, startSeconds + 1)
                    if endSeconds - startSeconds > maxLength {
                        startSeconds = max(windowStart, endSeconds - maxLength)
                    }
                }
            }
    }
}
