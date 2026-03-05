import Combine
import SwiftUI

/// Settings for automatic downloads and network preferences.
///
/// Subscribes to `PreferencesRepository` independently and writes
/// changes back immediately, following the same pattern as `PlaybackSettingsView`.
struct DownloadSettingsView: View {

    @State private var autoDownloadOnPlay: Bool = DownloadDefaults.autoDownloadOnPlay
    @State private var downloadNetwork: String = DownloadDefaults.downloadNetwork
    @State private var hasInitialized = false
    @State private var cancellables = Set<AnyCancellable>()

    private let preferencesRepository = PreferencesRepository()

    var body: some View {
        Form {
            Section {
                Toggle("Auto-Download on Play", isOn: $autoDownloadOnPlay)
                    .onChange(of: autoDownloadOnPlay) { _, newValue in
                        guard hasInitialized else { return }
                        preferencesRepository.updatePreferences(autoDownloadOnPlay: newValue)
                    }
            } footer: {
                Text("Automatically start downloading a book when you press play, instead of showing a prompt.")
            }

            Section {
                Picker("Download Network", selection: $downloadNetwork) {
                    Text("Wi-Fi Only").tag("wifi")
                    Text("Wi-Fi & Cellular").tag("wifiAndCellular")
                }
                .onChange(of: downloadNetwork) { _, newValue in
                    guard hasInitialized else { return }
                    preferencesRepository.updatePreferences(downloadNetwork: newValue)
                }
            } footer: {
                Text("Which networks allow download prompts and auto-downloads.")
            }
        }
        .navigationTitle("Download Preferences")
        .onAppear { subscribeToPreferences() }
        .onDisappear { cancellables.removeAll() }
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
                    autoDownloadOnPlay = prefs?.autoDownloadOnPlay ?? DownloadDefaults.autoDownloadOnPlay
                    downloadNetwork = prefs?.downloadNetwork ?? DownloadDefaults.downloadNetwork
                    hasInitialized = true
                }
            )
            .store(in: &cancellables)
    }
}
