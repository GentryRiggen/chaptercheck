import SwiftUI

/// Bottom sheet for setting or adjusting a sleep timer.
///
/// Shows quick-set presets when inactive, and a live countdown with
/// ± adjustment buttons when a timer is running.
struct SleepTimerSheet: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer
    @Environment(\.dismiss) private var dismiss

    private static let quickSetMinutes: [[Double]] = [
        [5, 10, 15, 20],
        [30, 45, 60, 90],
    ]

    private static let adjustMinutes: [Double] = [1, 5, 10, 15, 30, 60]

    var body: some View {
        VStack(spacing: 20) {
            Text("Sleep Timer")
                .font(.title3)
                .fontWeight(.bold)
                .padding(.top, 20)

            if audioPlayer.isSleepTimerActive {
                activeTimerView
            } else {
                inactiveView
            }
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 24)
        .presentationDetents([.height(audioPlayer.isSleepTimerActive ? 320 : 280)])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Inactive: Quick-Set Grid

    private var inactiveView: some View {
        VStack(spacing: 16) {
            Text("Auto-pause after:")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            VStack(spacing: 10) {
                ForEach(Self.quickSetMinutes, id: \.self) { row in
                    HStack(spacing: 10) {
                        ForEach(row, id: \.self) { minutes in
                            Button {
                                Haptics.selection()
                                audioPlayer.setSleepTimer(minutes: minutes)
                            } label: {
                                Text(formatMinutesLabel(minutes))
                                    .font(.headline)
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 14)
                                    .background(.fill.tertiary, in: RoundedRectangle(cornerRadius: 12))
                            }
                            .buttonStyle(.plain)
                        }
                    }
                }
            }
        }
    }

    // MARK: - Active: Countdown + Adjustments

    private var activeTimerView: some View {
        VStack(spacing: 16) {
            Text(audioPlayer.formattedSleepTimer)
                .font(.system(size: 48, weight: .bold, design: .rounded))
                .monospacedDigit()
                .contentTransition(.numericText())
                .animation(.linear(duration: 0.3), value: audioPlayer.sleepTimerRemaining)

            // Adjustment grid: subtract row, then add row
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    ForEach(Self.adjustMinutes, id: \.self) { minutes in
                        adjustButton(minutes: -minutes)
                    }
                }
                HStack(spacing: 8) {
                    ForEach(Self.adjustMinutes, id: \.self) { minutes in
                        adjustButton(minutes: minutes)
                    }
                }
            }

            Button {
                Haptics.light()
                audioPlayer.cancelSleepTimer()
                dismiss()
            } label: {
                Text("Cancel Timer")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(.red)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(.red.opacity(0.12), in: RoundedRectangle(cornerRadius: 10))
            }
            .buttonStyle(.plain)
        }
    }

    // MARK: - Helpers

    private func adjustButton(minutes: Double) -> some View {
        let isSubtract = minutes < 0
        let label = isSubtract ? "\(Int(minutes))" : "+\(Int(minutes))"

        return Button {
            Haptics.selection()
            audioPlayer.adjustSleepTimer(byMinutes: minutes)
        } label: {
            Text(label)
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(isSubtract ? .secondary : .primary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 8)
                .background(.fill.tertiary, in: RoundedRectangle(cornerRadius: 8))
        }
        .buttonStyle(.plain)
    }

    private func formatMinutesLabel(_ minutes: Double) -> String {
        if minutes >= 60 {
            let hours = Int(minutes) / 60
            let remainingMinutes = Int(minutes) % 60
            if remainingMinutes > 0 {
                return "\(hours)h \(remainingMinutes)m"
            }
            return "\(hours)h"
        }
        return "\(Int(minutes))m"
    }
}
