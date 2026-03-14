import SwiftUI

struct BookNotePreviewSheet: View {
    let note: BookNote

    @Environment(\.dismiss) private var dismiss
    @Environment(DownloadManager.self) private var downloadManager

    @State private var clipPreviewPlayer = ClipPreviewPlayer()
    @State private var sliderValue: Double = 0
    @State private var isScrubbing = false

    var body: some View {
        NavigationStack {
            VStack(alignment: .leading, spacing: 18) {
                headerSection
                if note.isAudioAnchored {
                    playbackSection
                    detailSection
                }
                Spacer(minLength: 0)
            }
            .padding(20)
            .navigationTitle(note.isAudioAnchored ? "Note Clip" : note.entryTypeLabel)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
        .presentationDetents([note.isAudioAnchored ? .height(340) : .medium])
        .presentationDragIndicator(.visible)
        .onChange(of: clipPreviewPlayer.currentTime) { _, newValue in
            guard !isScrubbing else { return }
            sliderValue = newValue
        }
        .onDisappear {
            clipPreviewPlayer.stop()
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                if let noteTags = note.tags, !noteTags.isEmpty {
                    HStack(spacing: 6) {
                        ForEach(noteTags) { tag in
                            Label(tag.name, systemImage: "tag.fill")
                                .font(.caption.weight(.semibold))
                                .foregroundStyle(tag.displayColor)
                        }
                    }
                } else if !note.isAudioAnchored {
                    Label(note.entryTypeLabel, systemImage: note.entryTypeIcon)
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.tint)
                } else {
                    Text("Private note")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Text(TimeFormatting.formatRelativeDate(note.updatedAt))
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            if let sourceText = note.sourceText, !sourceText.isEmpty {
                Text("\u{201C}\(sourceText)\u{201D}")
                    .font(.body)
                    .italic()
            }

            if let noteText = note.noteText, !noteText.isEmpty {
                Text(noteText)
                    .font(.body)
            } else if note.isAudioAnchored {
                Text("Saved clip")
                    .font(.body)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private var playbackSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(TimeFormatting.formatTime(isScrubbing ? sliderValue : clipPreviewPlayer.currentTime))
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)

                Spacer()

                Text(TimeFormatting.formatTime(note.durationSeconds))
                    .font(.caption)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
            }

            Slider(
                value: Binding(
                    get: { isScrubbing ? sliderValue : clipPreviewPlayer.currentTime },
                    set: { sliderValue = $0 }
                ),
                in: 0...max(note.durationSeconds, 0.1),
                onEditingChanged: { editing in
                    isScrubbing = editing
                    if !editing {
                        clipPreviewPlayer.seek(toRelativeSeconds: sliderValue)
                    }
                }
            )
            .tint(Color.accentColor)

            HStack(spacing: 12) {
                Button {
                    clipPreviewPlayer.skip(by: -15)
                } label: {
                    Image(systemName: "gobackward.15")
                        .font(.title3)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.bordered)
                .disabled(clipPreviewPlayer.isLoading)

                Button {
                    Task { await togglePreview() }
                } label: {
                    HStack(spacing: 8) {
                        if clipPreviewPlayer.isLoading {
                            ProgressView()
                                .controlSize(.small)
                        } else {
                            Image(systemName: clipPreviewPlayer.isPlaying ? "pause.fill" : "play.fill")
                        }
                        Text(clipPreviewPlayer.isPlaying ? "Pause" : "Play Clip")
                    }
                    .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
                .disabled(clipPreviewPlayer.isLoading)

                Button {
                    clipPreviewPlayer.skip(by: 15)
                } label: {
                    Image(systemName: "goforward.15")
                        .font(.title3)
                        .frame(width: 44, height: 44)
                }
                .buttonStyle(.bordered)
                .disabled(clipPreviewPlayer.isLoading)
            }

            if clipPreviewPlayer.isPlaying || clipPreviewPlayer.currentTime > 0 {
                Button("Stop") {
                    clipPreviewPlayer.stop()
                    sliderValue = 0
                }
                .buttonStyle(.bordered)
            }

            Text("Playback here is separate from your main audiobook session and does not change listening stats or position.")
                .font(.caption)
                .foregroundStyle(.secondary)

            if let previewError = clipPreviewPlayer.errorMessage {
                Text(previewError)
                    .font(.caption)
                    .foregroundStyle(.red)
            }
        }
    }

    private var detailSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            if let audioFile = note.audioFile {
                Label(audioFile.displayName, systemImage: "book.closed")
                    .font(.subheadline)
            }

            if !note.formattedRange.isEmpty {
                Label(note.formattedRange, systemImage: "waveform")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }

    private func togglePreview() async {
        guard let audioFileId = note.audioFileId,
              let start = note.startSeconds,
              let end = note.endSeconds else { return }

        if clipPreviewPlayer.isPlaying {
            clipPreviewPlayer.pause()
            return
        }

        let localFileURL = await downloadManager.localFileURL(for: audioFileId)
        await clipPreviewPlayer.playClip(
            audioFileId: audioFileId,
            localFileURL: localFileURL,
            startSeconds: start,
            endSeconds: end
        )
    }
}
