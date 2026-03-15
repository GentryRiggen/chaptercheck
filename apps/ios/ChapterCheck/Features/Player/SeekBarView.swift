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

    var onSpeedPillTapped: (() -> Void)?

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

    /// Remaining time adjusted for playback speed, shown only when rate > 1.0.
    private var realTimeRemainingLabel: String? {
        let rate = audioPlayer.playbackRate
        guard rate > 1.0 else { return nil }
        let remaining = max(audioPlayer.duration - displaySeconds, 0)
        let adjusted = remaining / rate
        return "-\(TimeFormatting.formatTime(adjusted)) at \(formatRate(rate))"
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

                VStack(alignment: .trailing, spacing: 3) {
                    Text(remainingTimeLabel)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .monospacedDigit()

                    if let realTime = realTimeRemainingLabel {
                        Button {
                            Haptics.selection()
                            onSpeedPillTapped?()
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "hare.fill")
                                    .font(.system(size: 9))
                                Text(realTime)
                                    .font(.caption2.weight(.medium))
                                    .monospacedDigit()
                            }
                            .foregroundStyle(.tint)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 3)
                            .background(.tint.opacity(0.12), in: Capsule())
                        }
                        .buttonStyle(.plain)
                        .transition(.opacity.combined(with: .scale(scale: 0.8, anchor: .trailing)))
                    }
                }
                .animation(.spring(duration: 0.3), value: realTimeRemainingLabel != nil)
            }
        }
        .alignmentGuide(.seekBarTrackCenter) { dimensions in
            dimensions[.top] + 16
        }
    }

    private func formatRate(_ rate: Double) -> String {
        if rate == floor(rate) {
            return "\(Int(rate))×"
        }
        return String(format: "%.1f×", rate)
    }
}
