import SwiftUI

/// Playback speed control with minus/plus buttons and current rate display.
///
/// Range: 0.25x – 3.00x in 0.25 increments.
struct SpeedControlView: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer

    private static let minRate = 0.25
    private static let maxRate = 3.0
    private static let step = 0.25

    var body: some View {
        HStack(spacing: 12) {
            Button {
                Haptics.selection()
                let newRate = max(Self.minRate, audioPlayer.playbackRate - Self.step)
                audioPlayer.setRate(newRate)
            } label: {
                Image(systemName: "minus")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 44, height: 44)
                    .background(.fill.quaternary)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Decrease speed")
            .disabled(audioPlayer.playbackRate <= Self.minRate)
            .opacity(audioPlayer.playbackRate <= Self.minRate ? 0.35 : 1)

            Text(formatRate(audioPlayer.playbackRate))
                .font(.body)
                .fontWeight(.semibold)
                .monospacedDigit()
                .frame(minWidth: 52)

            Button {
                Haptics.selection()
                let newRate = min(Self.maxRate, audioPlayer.playbackRate + Self.step)
                audioPlayer.setRate(newRate)
            } label: {
                Image(systemName: "plus")
                    .font(.body.weight(.semibold))
                    .foregroundStyle(.primary)
                    .frame(width: 44, height: 44)
                    .background(.fill.quaternary)
                    .clipShape(Circle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Increase speed")
            .disabled(audioPlayer.playbackRate >= Self.maxRate)
            .opacity(audioPlayer.playbackRate >= Self.maxRate ? 0.35 : 1)
        }
    }

    private func formatRate(_ rate: Double) -> String {
        if rate == floor(rate) {
            return "\(Int(rate))x"
        }
        let formatted = String(format: "%g", rate)
        return "\(formatted)x"
    }
}
