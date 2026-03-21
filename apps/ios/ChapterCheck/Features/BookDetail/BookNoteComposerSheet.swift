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
    @State private var isPublic: Bool
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
        _isPublic = State(initialValue: context.existingNote?.isPublic ?? false)
        _startSeconds = State(initialValue: context.initialStartSeconds)
        _endSeconds = State(initialValue: context.initialEndSeconds)
    }

    var body: some View {
        NavigationStack {
            scrollContent
                .navigationTitle(context.existingNote == nil ? "Add Note" : "Edit Note")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar { toolbarContent }
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

    private var scrollContent: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                filePickerSection
                rangeSection
                previewSection
                noteTextSection
                tagSection
                visibilitySection
                if let errorMessage {
                    Text(errorMessage)
                        .font(.footnote)
                        .foregroundStyle(.red)
                }
            }
            .padding()
        }
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
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

    private var selectedAudioFile: AudioFile? {
        context.audioFiles.first(where: { $0._id == selectedAudioFileId })
    }

    private var maxDuration: Double {
        guard let duration = selectedAudioFile?.duration, duration > 0 else {
            return max(endSeconds, startSeconds + 1, 60)
        }
        return duration
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

    // MARK: - Sections

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
                    // Clamp range to new file duration
                    startSeconds = min(startSeconds, maxDuration)
                    endSeconds = min(endSeconds, maxDuration)
                    if startSeconds >= endSeconds { endSeconds = min(startSeconds + 60, maxDuration) }
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

            WaveformClipSelector(
                startSeconds: $startSeconds,
                endSeconds: $endSeconds,
                totalDuration: maxDuration,
                maxClipDuration: Self.maxNoteLengthSeconds,
                initialCenterTime: (context.initialStartSeconds + context.initialEndSeconds) / 2,
                playbackTime: clipPreviewPlayer.isPlaying ? startSeconds + clipPreviewPlayer.currentTime : nil
            )

            // Quick adjust controls — adjust whichever handle is active.
            HStack(spacing: 12) {
                quickAdjustButton(title: "-15", delta: -15)
                quickAdjustButton(title: "-5", delta: -5)

                Button {
                    activeHandle = activeHandle == .start ? .end : .start
                } label: {
                    Text(activeHandle == .start ? "Adjusting start" : "Adjusting end")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.plain)

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

    private var visibilitySection: some View {
        Toggle("Share publicly", isOn: $isPublic)
            .font(.subheadline)
    }

    // MARK: - Controls

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

    // MARK: - Logic

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
            let newStart = (startSeconds + delta).clamped(to: 0...(endSeconds - 1))
            startSeconds = newStart
            if endSeconds - startSeconds > Self.maxNoteLengthSeconds {
                endSeconds = min(startSeconds + Self.maxNoteLengthSeconds, maxDuration)
            }
        case .end:
            let newEnd = (endSeconds + delta).clamped(to: (startSeconds + 1)...maxDuration)
            endSeconds = newEnd
            if endSeconds - startSeconds > Self.maxNoteLengthSeconds {
                startSeconds = max(endSeconds - Self.maxNoteLengthSeconds, 0)
            }
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
                    }(),
                    isPublic: isPublic
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

// MARK: - Supporting types

struct BookNoteSavePayload {
    let noteId: String?
    let audioFileId: String
    let tagIds: [String]
    let startSeconds: Double
    let endSeconds: Double
    let noteText: String?
    let isPublic: Bool
}

private enum RangeHandle {
    case start
    case end
}

// MARK: - Comparable clamped helpers

private extension Double {
    func clamped(to range: ClosedRange<Double>) -> Double {
        Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
    }
}

private extension CGFloat {
    func clamped(to range: ClosedRange<CGFloat>) -> CGFloat {
        Swift.min(Swift.max(self, range.lowerBound), range.upperBound)
    }
}

// MARK: - WaveformClipSelector

/// An Overcast-style scrollable waveform clip selector.
///
/// The waveform spans the full audio duration and can be panned horizontally.
/// A highlighted selection box with draggable handles marks the clip boundaries.
/// Panning and handle-dragging share a single DragGesture; the mode is determined
/// by the proximity of the drag start location to each handle.
private struct WaveformClipSelector: View {

    @Binding var startSeconds: Double
    @Binding var endSeconds: Double
    let totalDuration: Double
    let maxClipDuration: Double
    /// The time (seconds) to center the viewport on when the view first appears.
    let initialCenterTime: Double
    /// Absolute playback time (seconds into the audio file) while previewing, or nil when not playing.
    let playbackTime: Double?

    // MARK: Layout constants

    /// Visible seconds of audio in the viewport. ~2 minutes gives a good balance
    /// between fine adjustment precision and contextual overview.
    private static let visibleDuration: Double = 120
    private static let waveformHeight: CGFloat = 80
    private static let barWidth: CGFloat = 3
    private static let barGap: CGFloat = 1
    private static let barStride: CGFloat = barWidth + barGap
    private static let handleHitRadius: CGFloat = 30
    private static let selectionCornerRadius: CGFloat = 6
    private static let selectionBorderWidth: CGFloat = 2
    private static let handlePillWidth: CGFloat = 8
    private static let handlePillHeight: CGFloat = 40

    // MARK: State

    /// The audio time (seconds) at the center of the viewport.
    @State private var panCenterTime: Double = 0
    /// Drag interaction mode for the active gesture.
    @State private var dragMode: DragMode = .panning
    /// Whether a drag mode has been committed for the current gesture.
    @State private var didDetermineMode: Bool = false
    /// Accumulated pan translation since drag start, for delta computation.
    @State private var lastDragTranslation: CGFloat = 0
    /// Recent drag samples for momentum computation: (timestamp, panCenterTime)
    @State private var velocitySamples: [(time: Date, panCenter: Double)] = []
    /// Measured viewport width from GeometryReader.
    @State private var viewportWidth: CGFloat = 300

    private enum DragMode: Equatable {
        case panning
        case draggingStart
        case draggingEnd
    }

    // MARK: Derived layout

    private var totalDurationSafe: Double { max(totalDuration, 1) }
    private var pixelsPerSecond: CGFloat { viewportWidth / Self.visibleDuration }
    private var timeAtLeftEdge: Double { panCenterTime - Self.visibleDuration / 2 }

    private func screenX(for time: Double) -> CGFloat {
        CGFloat(time - timeAtLeftEdge) * pixelsPerSecond
    }

    private func time(atScreenX x: CGFloat) -> Double {
        timeAtLeftEdge + Double(x) / Double(pixelsPerSecond)
    }

    private func clampedCenter(_ candidate: Double) -> Double {
        let halfVisible = Self.visibleDuration / 2
        let lower = min(halfVisible, totalDurationSafe / 2)
        let upper = max(totalDurationSafe - halfVisible, totalDurationSafe / 2)
        return candidate.clamped(to: lower...upper)
    }

    // MARK: Waveform bar height

    private func barHeight(for index: Int, maxHeight: CGFloat) -> CGFloat {
        // Deterministic pseudo-random using a sum of sine waves at different frequencies.
        // Produces natural-looking variation without any randomness source.
        let d = Double(index)
        let raw = abs(sin(d * 0.1 + cos(d * 0.3)) * 0.5 + 0.5)
        return CGFloat(raw) * maxHeight * 0.8 + maxHeight * 0.2
    }

    // MARK: Body

    var body: some View {
        VStack(spacing: 6) {
            GeometryReader { geo in
                let width = geo.size.width

                ZStack {
                    // Waveform canvas — full extent, clipped to viewport
                    waveformCanvas(width: width)

                    // Dimming overlays outside the selection
                    selectionDimming(width: width)

                    // Selection border + handles
                    selectionBorderAndHandles(width: width)

                    // Center playhead line
                    playheadLine(width: width)
                }
                .frame(width: width, height: Self.waveformHeight)
                .clipped()
                .contentShape(Rectangle())
                .gesture(panAndHandleGesture)
                .onAppear {
                    viewportWidth = width
                    panCenterTime = clampedCenter(initialCenterTime)
                }
                .onChange(of: width) { _, newWidth in
                    viewportWidth = newWidth
                }
            }
            .frame(height: Self.waveformHeight)

            // Time labels: START on left, DURATION on right — Overcast style
            HStack {
                VStack(alignment: .leading, spacing: 1) {
                    Text("START")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.tertiary)
                    Text(TimeFormatting.formatTime(startSeconds))
                        .font(.caption2)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 1) {
                    Text("DURATION")
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.tertiary)
                    Text(TimeFormatting.formatDuration(endSeconds - startSeconds))
                        .font(.caption2)
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            }
        }
    }

    // MARK: - Subviews

    /// Renders waveform bars using Canvas for efficient drawing.
    /// Only bars that intersect the visible viewport are drawn.
    private func waveformCanvas(width: CGFloat) -> some View {
        Canvas { context, size in
            let height = size.height
            let stride = Self.barStride
            let bw = Self.barWidth

            // Compute the pixel offset from the absolute waveform origin to the left edge
            // of the viewport. Bars at absolute pixel position >= absoluteOffset are visible.
            let absoluteOffset = CGFloat(timeAtLeftEdge) * pixelsPerSecond

            // Total bars across the full audio duration.
            let totalBars = Int(ceil(CGFloat(totalDurationSafe) * pixelsPerSecond / stride))

            // Only iterate bars that could intersect [0, width] in screen space.
            let firstBarIndex = max(0, Int(floor(absoluteOffset / stride)))
            let lastBarIndex = min(totalBars - 1, Int(ceil((absoluteOffset + width) / stride)) + 1)

            guard firstBarIndex <= lastBarIndex else { return }

            for barIndex in firstBarIndex...lastBarIndex {
                let screenBarX = CGFloat(barIndex) * stride - absoluteOffset

                guard screenBarX + bw >= 0, screenBarX < width else { continue }

                let bh = barHeight(for: barIndex, maxHeight: height)
                let barY = (height - bh) / 2
                let barRect = CGRect(x: screenBarX, y: barY, width: bw, height: bh)
                let barPath = Path(roundedRect: barRect, cornerRadius: bw / 2)

                // Color bars inside the selection with accent, outside with dimmed tertiary.
                let barCenterTime = time(atScreenX: screenBarX + bw / 2)
                let isSelected = barCenterTime >= startSeconds && barCenterTime <= endSeconds
                let color: Color = isSelected ? .accentColor : Color(.tertiaryLabel)
                context.fill(barPath, with: .color(color))
            }
        }
    }

    /// Black opacity overlays to the left and right of the selection region.
    private func selectionDimming(width: CGFloat) -> some View {
        let startX = screenX(for: startSeconds).clamped(to: 0...width)
        let endX = screenX(for: endSeconds).clamped(to: 0...width)

        return ZStack(alignment: .leading) {
            // Left dim
            Rectangle()
                .fill(Color.black.opacity(0.38))
                .frame(width: startX)
                .frame(maxHeight: .infinity)
                .frame(maxWidth: .infinity, alignment: .leading)

            // Right dim
            Rectangle()
                .fill(Color.black.opacity(0.38))
                .frame(width: max(width - endX, 0))
                .frame(maxHeight: .infinity)
                .frame(maxWidth: .infinity, alignment: .trailing)
        }
        .allowsHitTesting(false)
    }

    /// The rounded-rect border framing the selection, plus the handle pill indicators.
    @ViewBuilder
    private func selectionBorderAndHandles(width: CGFloat) -> some View {
        let startX = screenX(for: startSeconds).clamped(to: 0...width)
        let endX = screenX(for: endSeconds).clamped(to: 0...width)
        let selWidth = max(endX - startX, 8)

        // Selection border
        RoundedRectangle(cornerRadius: Self.selectionCornerRadius)
            .stroke(Color.accentColor, lineWidth: Self.selectionBorderWidth)
            .frame(width: selWidth, height: Self.waveformHeight - 2)
            .offset(x: startX - (width / 2 - selWidth / 2))
            .allowsHitTesting(false)

        // Left handle pill — centered on the left selection edge.
        RoundedRectangle(cornerRadius: Self.handlePillWidth / 2)
            .fill(Color.accentColor)
            .frame(width: Self.handlePillWidth, height: Self.handlePillHeight)
            .offset(x: startX - width / 2)
            .allowsHitTesting(false)

        // Right handle pill — centered on the right selection edge.
        RoundedRectangle(cornerRadius: Self.handlePillWidth / 2)
            .fill(Color.accentColor)
            .frame(width: Self.handlePillWidth, height: Self.handlePillHeight)
            .offset(x: endX - width / 2)
            .allowsHitTesting(false)
    }

    /// A thin vertical line showing the current playback position during preview,
    /// or a subtle center line for orientation when not playing.
    @ViewBuilder
    private func playheadLine(width: CGFloat) -> some View {
        if let playbackTime {
            let x = screenX(for: playbackTime)
            if x >= 0, x <= width {
                Rectangle()
                    .fill(Color.primary)
                    .frame(width: 2, height: Self.waveformHeight)
                    .offset(x: x - width / 2)
                    .allowsHitTesting(false)
            }
        } else {
            Rectangle()
                .fill(Color.primary.opacity(0.2))
                .frame(width: 1, height: Self.waveformHeight)
                .allowsHitTesting(false)
        }
    }

    // MARK: - Gesture

    /// The unified pan + handle drag gesture.
    ///
    /// Uses a single DragGesture on the entire component. The interaction mode
    /// (panning vs. handle dragging) is committed once per gesture using the
    /// finger-down location stored in `value.startLocation`. Subsequent events
    /// continue in the committed mode regardless of where the finger moves.
    private var panAndHandleGesture: some Gesture {
        DragGesture(minimumDistance: 4, coordinateSpace: .local)
            .onChanged { value in
                // Commit to an interaction mode exactly once per gesture, using the
                // stable finger-down position so mode cannot drift mid-drag.
                if !didDetermineMode {
                    didDetermineMode = true
                    let sx = value.startLocation.x
                    let startHandleX = screenX(for: startSeconds)
                    let endHandleX = screenX(for: endSeconds)
                    if abs(sx - startHandleX) <= Self.handleHitRadius {
                        dragMode = .draggingStart
                    } else if abs(sx - endHandleX) <= Self.handleHitRadius {
                        dragMode = .draggingEnd
                    } else {
                        dragMode = .panning
                    }
                }

                switch dragMode {
                case .panning:
                    // Compute delta from accumulated translation to avoid discontinuities.
                    let delta = value.translation.width - lastDragTranslation
                    lastDragTranslation = value.translation.width
                    // Dragging right moves the viewport to earlier audio time (invert).
                    let timeDelta = -Double(delta) / Double(pixelsPerSecond)
                    panCenterTime = clampedCenter(panCenterTime + timeDelta)

                    // Record samples for momentum deceleration (keep last 5).
                    velocitySamples.append((time: Date(), panCenter: panCenterTime))
                    if velocitySamples.count > 5 { velocitySamples.removeFirst() }

                case .draggingStart:
                    let rawTime = time(atScreenX: value.location.x)
                    startSeconds = rawTime.clamped(to: 0...(endSeconds - 1))
                    // Push end forward if the clip would exceed the maximum duration.
                    if endSeconds - startSeconds > maxClipDuration {
                        endSeconds = min(startSeconds + maxClipDuration, totalDurationSafe)
                    }

                case .draggingEnd:
                    let rawTime = time(atScreenX: value.location.x)
                    endSeconds = rawTime.clamped(to: (startSeconds + 1)...totalDurationSafe)
                    // Push start back if the clip would exceed the maximum duration.
                    if endSeconds - startSeconds > maxClipDuration {
                        startSeconds = max(endSeconds - maxClipDuration, 0)
                    }
                }
            }
            .onEnded { _ in
                let endedMode = dragMode

                // Reset per-gesture transient state.
                didDetermineMode = false
                dragMode = .panning
                lastDragTranslation = 0

                guard endedMode == .panning, velocitySamples.count >= 2 else {
                    velocitySamples.removeAll()
                    return
                }

                // Velocity from the two most recent samples (seconds of audio / wall second).
                let newest = velocitySamples.last!
                let older = velocitySamples[velocitySamples.count - 2]
                let dt = newest.time.timeIntervalSince(older.time)
                velocitySamples.removeAll()

                guard dt > 0 else { return }

                let velocity = (newest.panCenter - older.panCenter) / dt
                let decelerationFactor: Double = 0.4
                let targetCenter = clampedCenter(panCenterTime + velocity * decelerationFactor)

                withAnimation(.easeOut(duration: 0.5)) {
                    panCenterTime = targetCenter
                }
            }
    }
}
