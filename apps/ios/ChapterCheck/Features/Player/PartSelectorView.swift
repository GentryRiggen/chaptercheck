import SwiftUI

/// Sheet listing all audio file parts for the current book.
///
/// The currently playing part is highlighted. Tapping a part switches to it.
struct PartSelectorView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                ForEach(audioPlayer.audioFiles) { file in
                    partRow(file)
                }
            }
            .listStyle(.plain)
            .navigationTitle("Parts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }

    private func partRow(_ file: AudioFile) -> some View {
        let isCurrentPart = audioPlayer.currentAudioFile?._id == file._id

        return Button {
            if !isCurrentPart {
                Haptics.medium()
                audioPlayer.playPart(file)
            }
            dismiss()
        } label: {
            HStack(spacing: 12) {
                // Part number
                ZStack {
                    Circle()
                        .fill(isCurrentPart ? Color.accentColor : Color(.systemFill))
                        .frame(width: 32, height: 32)

                    if isCurrentPart && audioPlayer.isPlaying {
                        Image(systemName: "waveform")
                            .font(.caption2)
                            .foregroundStyle(.white)
                            .symbolEffect(.variableColor.iterative)
                    } else {
                        Text("\(file.partNumberInt)")
                            .font(.caption)
                            .fontWeight(.medium)
                            .foregroundStyle(isCurrentPart ? .white : .primary)
                    }
                }

                // File info
                VStack(alignment: .leading, spacing: 2) {
                    Text(file.displayName ?? file.friendlyName ?? file.fileName)
                        .font(.subheadline)
                        .fontWeight(isCurrentPart ? .semibold : .regular)
                        .foregroundStyle(.primary)
                        .lineLimit(1)

                    Text(file.formattedDuration)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                if isCurrentPart {
                    Image(systemName: "checkmark")
                        .font(.body)
                        .foregroundStyle(.tint)
                }
            }
        }
        .listRowBackground(isCurrentPart ? Color.accentColor.opacity(0.08) : nil)
    }
}
