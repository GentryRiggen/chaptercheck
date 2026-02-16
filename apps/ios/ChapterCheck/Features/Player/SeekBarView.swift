import SwiftUI

/// Custom seek bar for the now playing screen.
///
/// Displays current time and remaining time labels with a draggable slider.
/// Uses `DragGesture` for precise scrubbing, and debounces the seek call
/// to avoid excessive seeks during rapid dragging.
struct SeekBarView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer

    @State private var isDragging = false
    @State private var dragProgress: Double = 0

    /// The progress value to display (either live or drag-in-progress).
    private var displayProgress: Double {
        isDragging ? dragProgress : audioPlayer.progress
    }

    /// The time label for the current position.
    private var currentTimeLabel: String {
        if isDragging {
            let seconds = dragProgress * audioPlayer.duration
            return TimeFormatting.formatTime(seconds)
        }
        return audioPlayer.formattedElapsedTime
    }

    /// The time label for the remaining duration.
    private var remainingTimeLabel: String {
        if isDragging {
            let remaining = (1 - dragProgress) * audioPlayer.duration
            return "-\(TimeFormatting.formatTime(remaining))"
        }
        return audioPlayer.formattedRemainingTime
    }

    var body: some View {
        VStack(spacing: 4) {
            // Slider track
            GeometryReader { geometry in
                let trackWidth = geometry.size.width

                ZStack(alignment: .leading) {
                    // Background track
                    Capsule()
                        .fill(.fill.tertiary)
                        .frame(height: isDragging ? 8 : 4)

                    // Filled track
                    Capsule()
                        .fill(Color.accentColor)
                        .frame(width: trackWidth * displayProgress, height: isDragging ? 8 : 4)

                    // Thumb
                    Circle()
                        .fill(Color.accentColor)
                        .frame(width: isDragging ? 20 : 12, height: isDragging ? 20 : 12)
                        .shadow(color: .black.opacity(0.15), radius: 2, y: 1)
                        .offset(x: (trackWidth * displayProgress) - (isDragging ? 10 : 6))
                }
                .frame(height: 20)
                .contentShape(Rectangle())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            isDragging = true
                            let newProgress = max(0, min(1, value.location.x / trackWidth))
                            dragProgress = newProgress
                        }
                        .onEnded { value in
                            let finalProgress = max(0, min(1, value.location.x / trackWidth))
                            let seekPosition = finalProgress * audioPlayer.duration
                            audioPlayer.seek(to: seekPosition)
                            Haptics.selection()

                            isDragging = false
                        }
                )
            }
            .frame(height: 20)

            // Time labels
            HStack {
                Text(currentTimeLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()

                Spacer()

                Text(remainingTimeLabel)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .monospacedDigit()
            }
        }
        .animation(.easeInOut(duration: 0.15), value: isDragging)
    }
}
