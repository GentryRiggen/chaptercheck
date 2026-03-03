import SwiftUI

/// Sheet for audio playback settings: speed control and voice boost toggle.
///
/// Overcast-inspired layout with grouped sections on a material background.
struct AudioSettingsSheet: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer

    private static let minRate = 0.5
    private static let maxRate = 3.0
    private static let step = 0.1

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            // Header
            Text("Audio")
                .font(.title2)
                .fontWeight(.bold)
                .padding(.horizontal, 36)
                .padding(.top, 16)

            // Speed control row
            HStack {
                Text("Playback Speed")
                    .font(.body)

                Spacer()

                Text(formatRate(audioPlayer.playbackRate))
                    .font(.body)
                    .fontWeight(.semibold)
                    .monospacedDigit()
                    .foregroundStyle(.secondary)
                    .frame(minWidth: 44)

                HStack(spacing: 0) {
                    Button {
                        Haptics.selection()
                        let newRate = max(Self.minRate, (audioPlayer.playbackRate - Self.step).rounded(toPlaces: 1))
                        audioPlayer.setRate(newRate)
                    } label: {
                        Image(systemName: "minus")
                            .font(.body.weight(.semibold))
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .disabled(audioPlayer.playbackRate <= Self.minRate)
                    .opacity(audioPlayer.playbackRate <= Self.minRate ? 0.35 : 1)

                    Divider()
                        .frame(height: 20)

                    Button {
                        Haptics.selection()
                        let newRate = min(Self.maxRate, (audioPlayer.playbackRate + Self.step).rounded(toPlaces: 1))
                        audioPlayer.setRate(newRate)
                    } label: {
                        Image(systemName: "plus")
                            .font(.body.weight(.semibold))
                            .frame(width: 44, height: 44)
                            .contentShape(Rectangle())
                    }
                    .disabled(audioPlayer.playbackRate >= Self.maxRate)
                    .opacity(audioPlayer.playbackRate >= Self.maxRate ? 0.35 : 1)
                }
                .buttonStyle(.plain)
                .background(.fill.tertiary, in: RoundedRectangle(cornerRadius: 10))
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(.fill.quaternary, in: RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 16)

            // Voice boost toggle
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Voice Boost")
                        .font(.body)
                    Text("Clear, consistent volume")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }

                Spacer()

                Toggle("Voice Boost", isOn: Binding(
                    get: { audioPlayer.isVoiceBoostEnabled },
                    set: { audioPlayer.setVoiceBoost($0) }
                ))
                .labelsHidden()
                .tint(.accentColor)
                .accessibilityHint("Enhances voice clarity and evens out volume")
            }
            .padding(.horizontal, 20)
            .padding(.vertical, 12)
            .background(.fill.quaternary, in: RoundedRectangle(cornerRadius: 14))
            .padding(.horizontal, 16)

            Spacer()
        }
        .presentationDetents([.height(260)])
        .presentationDragIndicator(.visible)
    }

    private func formatRate(_ rate: Double) -> String {
        if rate == floor(rate) {
            return "\(Int(rate))x"
        }
        return String(format: "%.1fx", rate)
    }
}

private extension Double {
    func rounded(toPlaces places: Int) -> Double {
        let multiplier = pow(10.0, Double(places))
        return (self * multiplier).rounded() / multiplier
    }
}
