import Combine
import SwiftUI

/// Full-page playback settings accessible from the Settings screen,
/// even when no audio is playing.
///
/// Subscribes to `PreferencesRepository` independently and writes
/// changes back immediately.
struct PlaybackSettingsView: View {

    @State private var skipForward: Double = PlaybackDefaults.skipForwardSeconds
    @State private var skipBackward: Double = PlaybackDefaults.skipBackwardSeconds
    @State private var momentumSkipEnabled: Bool = PlaybackDefaults.momentumSkipEnabled
    @State private var smartRewindEnabled: Bool = PlaybackDefaults.smartRewindEnabled
    @State private var voiceBoostEnabled: Bool = PlaybackDefaults.voiceBoostEnabled
    @State private var hasInitialized = false
    @State private var cancellables = Set<AnyCancellable>()

    private let preferencesRepository = PreferencesRepository()

    private static let forwardOptions: [Double] = [10, 15, 30, 45, 60]
    private static let backwardOptions: [Double] = [5, 10, 15, 30]

    var body: some View {
        Form {
            Section {
                skipPicker(
                    title: "Skip Forward",
                    options: Self.forwardOptions,
                    selected: $skipForward
                ) { preferencesRepository.updatePreferences(skipForwardSeconds: $0) }

                skipPicker(
                    title: "Skip Backward",
                    options: Self.backwardOptions,
                    selected: $skipBackward
                ) { preferencesRepository.updatePreferences(skipBackwardSeconds: $0) }
            } header: {
                Text("Skip Durations")
            }

            Section {
                Toggle("Momentum Skipping", isOn: $momentumSkipEnabled)
                    .onChange(of: momentumSkipEnabled) { _, newValue in
                        guard hasInitialized else { return }
                        preferencesRepository.updatePreferences(momentumSkipEnabled: newValue)
                    }
            } footer: {
                Text("Skip farther with rapid taps.")
            }

            Section {
                Toggle("Smart Rewind", isOn: $smartRewindEnabled)
                    .onChange(of: smartRewindEnabled) { _, newValue in
                        guard hasInitialized else { return }
                        preferencesRepository.updatePreferences(smartRewindEnabled: newValue)
                    }
            } footer: {
                Text("Rewind slightly when resuming after a break.")
            }

            Section {
                Toggle("Voice Boost", isOn: $voiceBoostEnabled)
                    .onChange(of: voiceBoostEnabled) { _, newValue in
                        guard hasInitialized else { return }
                        preferencesRepository.updatePreferences(voiceBoostEnabled: newValue)
                    }
            } footer: {
                Text("Enhances voice clarity and evens out volume.")
            }
        }
        .navigationTitle("Playback")
        .onAppear { subscribeToPreferences() }
        .onDisappear { cancellables.removeAll() }
    }

    // MARK: - Skip Picker

    private func skipPicker(
        title: String,
        options: [Double],
        selected: Binding<Double>,
        onChange: @escaping (Double) -> Void
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.body)

            HStack(spacing: 8) {
                ForEach(options, id: \.self) { value in
                    Button {
                        Haptics.selection()
                        selected.wrappedValue = value
                        guard hasInitialized else { return }
                        onChange(value)
                    } label: {
                        Text("\(Int(value))s")
                            .font(.subheadline)
                            .fontWeight(selected.wrappedValue == value ? .semibold : .regular)
                            .foregroundStyle(selected.wrappedValue == value ? .white : .primary)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                            .background(
                                selected.wrappedValue == value
                                    ? AnyShapeStyle(.tint) : AnyShapeStyle(.fill.tertiary),
                                in: RoundedRectangle(cornerRadius: 8)
                            )
                    }
                    .buttonStyle(.plain)
                }
            }
        }
        .padding(.vertical, 4)
    }

    // MARK: - Subscription

    private func subscribeToPreferences() {
        guard cancellables.isEmpty,
              let publisher = preferencesRepository.subscribeToPreferences() else { return }

        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { prefs in
                    skipForward = prefs?.skipForwardSeconds ?? PlaybackDefaults.skipForwardSeconds
                    skipBackward = prefs?.skipBackwardSeconds ?? PlaybackDefaults.skipBackwardSeconds
                    momentumSkipEnabled = prefs?.momentumSkipEnabled ?? PlaybackDefaults.momentumSkipEnabled
                    smartRewindEnabled = prefs?.smartRewindEnabled ?? PlaybackDefaults.smartRewindEnabled
                    voiceBoostEnabled = prefs?.voiceBoostEnabled ?? PlaybackDefaults.voiceBoostEnabled
                    hasInitialized = true
                }
            )
            .store(in: &cancellables)
    }
}
