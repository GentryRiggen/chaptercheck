import SwiftUI

/// Horizontal row of playback rate buttons.
///
/// The current rate is highlighted with a filled background.
/// Tapping a rate button calls `AudioPlayerManager.setRate()`.
struct SpeedControlView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer

    private static let rates: [Double] = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0]

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 4) {
                ForEach(Self.rates, id: \.self) { rate in
                    rateButton(rate)
                }
            }
        }
    }

    private func rateButton(_ rate: Double) -> some View {
        let isSelected = abs(audioPlayer.playbackRate - rate) < 0.01

        return Button {
            Haptics.selection()
            audioPlayer.setRate(rate)
        } label: {
            Text(formatRate(rate))
                .font(.caption)
                .fontWeight(isSelected ? .bold : .regular)
                .foregroundStyle(isSelected ? .white : .secondary)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(
                    isSelected ? Color.accentColor : Color(.systemFill)
                )
                .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }

    private func formatRate(_ rate: Double) -> String {
        if rate == floor(rate) {
            return "\(Int(rate))x"
        }
        // Remove trailing zeros: 0.75x, 1.25x
        let formatted = String(format: "%.2g", rate)
        return "\(formatted)x"
    }
}
