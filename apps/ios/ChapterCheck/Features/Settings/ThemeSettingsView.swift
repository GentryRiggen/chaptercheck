import Combine
import SwiftUI

/// Theme settings for accent color and color scheme.
///
/// Subscribes to `PreferencesRepository` for cloud sync and writes
/// changes via `ThemeManager`.
struct ThemeSettingsView: View {

    @Environment(ThemeManager.self) private var themeManager

    @State private var selectedAccent: String = PlaybackDefaults.accentColor
    @State private var selectedScheme: String = PlaybackDefaults.colorSchemeMode
    @State private var hasInitialized = false
    @State private var cancellables = Set<AnyCancellable>()
    @State private var previewToggle = true

    private let preferencesRepository = PreferencesRepository()

    private let columns = [GridItem(.adaptive(minimum: 36), spacing: 10)]

    var body: some View {
        Form {
            Section {
                Picker("Appearance", selection: $selectedScheme) {
                    Text("System").tag("system")
                    Text("Light").tag("light")
                    Text("Dark").tag("dark")
                }
                .pickerStyle(.segmented)
                .onChange(of: selectedScheme) { _, newValue in
                    guard hasInitialized else { return }
                    themeManager.setColorSchemeMode(newValue)
                }
            } header: {
                Text("Appearance")
            }

            Section {
                LazyVGrid(columns: columns, spacing: 10) {
                    ForEach(AccentColorToken.all) { token in
                        Button {
                            Haptics.selection()
                            selectedAccent = token.id
                            guard hasInitialized else { return }
                            themeManager.setAccentColor(token.id)
                        } label: {
                            Circle()
                                .fill(token.color)
                                .frame(width: 36, height: 36)
                                .overlay {
                                    if selectedAccent == token.id {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 14, weight: .bold))
                                            .foregroundStyle(.white)
                                    }
                                }
                        }
                        .buttonStyle(.plain)
                        .accessibilityLabel(token.displayName)
                    }
                }
                .padding(.vertical, 8)
            } header: {
                Text("Accent Color")
            }

            // Live preview
            Section {
                VStack(spacing: 16) {
                    previewMiniPlayer
                    previewTransportControls
                    previewProgressCard
                    previewControls
                }
                .padding(.vertical, 8)
            } header: {
                Text("Preview")
            }
        }
        .navigationTitle("Theme")
        .onAppear { subscribeToPreferences() }
        .onDisappear { cancellables.removeAll() }
    }

    // MARK: - Preview Components

    /// Mock mini player bar.
    private var previewMiniPlayer: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 6)
                .fill(.fill.tertiary)
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: "book.closed.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(.secondary)
                }

            VStack(alignment: .leading, spacing: 2) {
                Text("The Way of Kings")
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(1)
                Text("Brandon Sanderson")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 4)

            HStack(spacing: 6) {
                Image(systemName: "gobackward.15")
                    .font(.system(size: 16))
                    .foregroundStyle(.tint)
                    .frame(width: 30, height: 30)
                Image(systemName: "play.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(.tint)
                    .frame(width: 30, height: 30)
                Image(systemName: "goforward.30")
                    .font(.system(size: 16))
                    .foregroundStyle(.tint)
                    .frame(width: 30, height: 30)
            }
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 8)
        .background(.fill.quaternary, in: Capsule())
    }

    /// Mock transport controls (now playing style).
    private var previewTransportControls: some View {
        HStack(spacing: 20) {
            Image(systemName: "gobackward.15")
                .font(.system(size: 28))
                .foregroundStyle(.tint)

            Image(systemName: "pause.fill")
                .font(.system(size: 38))
                .foregroundStyle(.tint)

            Image(systemName: "goforward.30")
                .font(.system(size: 28))
                .foregroundStyle(.tint)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    /// Mock listening progress card.
    private var previewProgressCard: some View {
        HStack(spacing: 12) {
            // Avatar
            Circle()
                .fill(themeManager.accentGradient)
                .frame(width: 40, height: 40)
                .overlay {
                    Image(systemName: "person.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(.white)
                }

            VStack(alignment: .leading, spacing: 6) {
                Text("Words of Radiance")
                    .font(.subheadline)
                    .fontWeight(.medium)

                ProgressView(value: 0.65)

                Text("65% · 14h 22m left")
                    .font(.caption2)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(12)
        .background(.fill.quaternary, in: RoundedRectangle(cornerRadius: 12))
    }

    /// Mock toggle + button controls.
    private var previewControls: some View {
        VStack(spacing: 12) {
            HStack {
                Label("Voice Boost", systemImage: "waveform")
                    .font(.subheadline)
                Spacer()
                Toggle("", isOn: $previewToggle)
                    .labelsHidden()
            }

            HStack(spacing: 12) {
                // Seek bar mock
                VStack(spacing: 4) {
                    GeometryReader { geo in
                        ZStack(alignment: .leading) {
                            Capsule()
                                .fill(.fill.tertiary)
                                .frame(height: 4)
                            Capsule()
                                .fill(.tint)
                                .frame(width: geo.size.width * 0.6, height: 4)
                            Circle()
                                .fill(.tint)
                                .frame(width: 12, height: 12)
                                .offset(x: geo.size.width * 0.6 - 6)
                        }
                    }
                    .frame(height: 12)

                    HStack {
                        Text("8:20:14")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                        Spacer()
                        Text("-3:35:12")
                            .font(.caption2)
                            .foregroundStyle(.secondary)
                    }
                }

                // Speed pill
                Text("1.5x")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 5)
                    .background(.tint, in: Capsule())
                    .foregroundStyle(.white)
            }
        }
        .padding(12)
        .background(.fill.quaternary, in: RoundedRectangle(cornerRadius: 12))
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
                    selectedAccent = prefs?.accentColor ?? PlaybackDefaults.accentColor
                    selectedScheme = prefs?.colorSchemeMode ?? PlaybackDefaults.colorSchemeMode
                    hasInitialized = true
                }
            )
            .store(in: &cancellables)
    }
}
