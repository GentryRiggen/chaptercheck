import SwiftUI

extension VerticalAlignment {
    private enum SeekBarTrackCenter: AlignmentID {
        static func defaultValue(in dimensions: ViewDimensions) -> CGFloat {
            dimensions[VerticalAlignment.center]
        }
    }

    static let seekBarTrackCenter = VerticalAlignment(SeekBarTrackCenter.self)
}

/// Seek bar for the now playing screen using the system Slider.
///
/// On iOS 26 the standard Slider automatically adopts the liquid-glass
/// appearance.  Current time and remaining time labels sit below the track.
struct SeekBarView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer

    @State private var isDragging = false
    @State private var sliderValue: Double = 0

    /// Seconds to display — live position or in-flight drag value.
    private var displaySeconds: Double {
        isDragging ? sliderValue : audioPlayer.currentPosition
    }

    private var currentTimeLabel: String {
        TimeFormatting.formatTime(displaySeconds)
    }

    private var remainingTimeLabel: String {
        let remaining = max(audioPlayer.duration - displaySeconds, 0)
        return "-\(TimeFormatting.formatTime(remaining))"
    }

    var body: some View {
        VStack(spacing: 4) {
            Slider(
                value: Binding(
                    get: { isDragging ? sliderValue : audioPlayer.currentPosition },
                    set: { sliderValue = $0 }
                ),
                in: 0...max(audioPlayer.duration, 0.1),
                onEditingChanged: { editing in
                    isDragging = editing
                    if !editing {
                        audioPlayer.seekFromSlider(to: sliderValue)
                        Haptics.selection()
                    }
                }
            )
            .alignmentGuide(.seekBarTrackCenter) { dimensions in
                dimensions[VerticalAlignment.center]
            }

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
        .alignmentGuide(.seekBarTrackCenter) { dimensions in
            dimensions[.top] + 16
        }
    }
}
