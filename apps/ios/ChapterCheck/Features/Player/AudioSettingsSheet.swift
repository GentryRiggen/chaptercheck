import Combine
import SwiftUI

/// Sheet for audio playback settings: speed control, voice boost, skip durations,
/// momentum skipping, and smart rewind.
///
/// Overcast-inspired layout with grouped sections on a material background.
struct AudioSettingsSheet: View {
    @Environment(AudioPlayerManager.self) private var audioPlayer

    private static let minRate = 0.5
    private static let maxRate = 3.0
    private static let step = 0.1

    private static let forwardOptions: [Double] = [10, 15, 30, 45, 60]
    private static let backwardOptions: [Double] = [5, 10, 15, 30]

    @State private var frequentRates: [PlaybackRateFrequency] = []
    @State private var rateSubscription: AnyCancellable?

    private let preferencesRepository = PreferencesRepository()
    private let progressRepository = ProgressRepository()

    /// Up to 3 speed presets from listening history, excluding the current rate.
    /// Falls back to [1.0, 1.5, 2.0] when there's no history.
    private var speedPresets: [Double] {
        let currentRounded = (audioPlayer.playbackRate * 10).rounded() / 10
        let defaults: [Double] = [1.0, 1.5, 2.0]

        let candidates: [Double]
        if frequentRates.isEmpty {
            candidates = defaults
        } else {
            candidates = frequentRates.map(\.rate)
        }

        return Array(
            candidates
                .filter { ($0 * 10).rounded() / 10 != currentRounded }
                .prefix(3)
        )
    }

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 16) {
                // Header + speed presets
                HStack {
                    Text("Audio")
                        .font(.title2)
                        .fontWeight(.bold)

                    Spacer()

                    if !speedPresets.isEmpty {
                        HStack(spacing: 8) {
                            ForEach(speedPresets, id: \.self) { rate in
                                Button {
                                    Haptics.selection()
                                    audioPlayer.setRate(rate)
                                } label: {
                                    Text(formatRate(rate))
                                        .font(.subheadline)
                                        .fontWeight(.medium)
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 16)
                                        .padding(.vertical, 8)
                                        .background(.tint, in: Capsule())
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }
                .padding(.horizontal, 20)
                .padding(.top, 16)

                // Speed control row
                speedControl

                // Voice boost toggle
                settingToggle(
                    title: "Voice Boost",
                    subtitle: "Clear, consistent volume",
                    isOn: audioPlayer.isVoiceBoostEnabled,
                    hint: "Enhances voice clarity and evens out volume"
                ) { audioPlayer.setVoiceBoost($0) }

                // Skip forward picker
                skipPicker(
                    title: "Skip Forward",
                    options: Self.forwardOptions,
                    selected: audioPlayer.baseSkipForward
                ) { value in
                    preferencesRepository.updatePreferences(skipForwardSeconds: value)
                }

                // Skip backward picker
                skipPicker(
                    title: "Skip Backward",
                    options: Self.backwardOptions,
                    selected: audioPlayer.baseSkipBackward
                ) { value in
                    preferencesRepository.updatePreferences(skipBackwardSeconds: value)
                }

                // Momentum skipping toggle
                settingToggle(
                    title: "Momentum Skipping",
                    subtitle: "Skip farther with rapid taps",
                    isOn: audioPlayer.isMomentumSkipEnabled
                ) { preferencesRepository.updatePreferences(momentumSkipEnabled: $0) }

                // Smart rewind toggle
                settingToggle(
                    title: "Smart Rewind",
                    subtitle: "Rewind slightly when resuming after a break",
                    isOn: audioPlayer.isSmartRewindEnabled
                ) { preferencesRepository.updatePreferences(smartRewindEnabled: $0) }
            }
            .padding(.bottom, 16)
        }
        .onAppear {
            guard rateSubscription == nil else { return }
            rateSubscription = progressRepository.subscribeToFrequentPlaybackRates()?
                .replaceError(with: [])
                .receive(on: DispatchQueue.main)
                .sink { rates in
                    frequentRates = rates
                }
        }
        .onDisappear {
            rateSubscription?.cancel()
            rateSubscription = nil
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Speed Control

    private var speedControl: some View {
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
    }

    // MARK: - Skip Picker

    private func skipPicker(
        title: String,
        options: [Double],
        selected: Double,
        onChange: @escaping (Double) -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.body)

            HStack(spacing: 8) {
                ForEach(options, id: \.self) { value in
                    Button {
                        Haptics.selection()
                        onChange(value)
                    } label: {
                        Text("\(Int(value))s")
                            .font(.subheadline)
                            .fontWeight(selected == value ? .semibold : .regular)
                            .foregroundStyle(selected == value ? .white : .primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(
                                selected == value ? AnyShapeStyle(.tint) : AnyShapeStyle(.fill.tertiary),
                                in: RoundedRectangle(cornerRadius: 8)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.fill.quaternary, in: RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal, 16)
    }

    // MARK: - Toggle Row

    private func settingToggle(
        title: String,
        subtitle: String,
        isOn: Bool,
        hint: String? = nil,
        onChange: @escaping (Bool) -> Void
    ) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.body)
                Text(subtitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            Toggle(title, isOn: Binding(
                get: { isOn },
                set: { onChange($0) }
            ))
            .labelsHidden()
            .accessibilityHint(hint ?? "")
        }
        .padding(.horizontal, 20)
        .padding(.vertical, 12)
        .background(.fill.quaternary, in: RoundedRectangle(cornerRadius: 14))
        .padding(.horizontal, 16)
    }

    // MARK: - Helpers

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
