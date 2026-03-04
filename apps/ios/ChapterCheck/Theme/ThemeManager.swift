import SwiftUI

/// Manages the app's accent color and color scheme preferences.
///
/// Injected via `.environment(themeManager)` at the app root.
/// Caches to UserDefaults for instant startup theming before auth loads.
@Observable
@MainActor
final class ThemeManager {

    // MARK: - State

    var accentColorName: String
    var colorSchemeModeName: String

    // MARK: - Computed

    var accentColor: Color {
        AccentColorToken.color(for: accentColorName)
    }

    var accentGradient: LinearGradient {
        LinearGradient(
            colors: AccentColorToken.gradientColors(for: accentColorName),
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    var preferredColorScheme: ColorScheme? {
        switch colorSchemeModeName {
        case "light": .light
        case "dark": .dark
        default: nil // "system" → follow OS
        }
    }

    // MARK: - Private

    private let preferencesRepository = PreferencesRepository()

    /// Timestamp of the last local user change. Subscription updates within
    /// the cooldown window are ignored to prevent reverting optimistic writes.
    private var lastLocalChangeAt: Date = .distantPast
    private static let syncCooldown: TimeInterval = 3

    private static let accentColorKey = "theme.accentColor"
    private static let colorSchemeModeKey = "theme.colorSchemeMode"

    // MARK: - Init

    init() {
        // Load cached values synchronously for instant theming
        self.accentColorName = UserDefaults.standard.string(forKey: Self.accentColorKey)
            ?? PlaybackDefaults.accentColor
        self.colorSchemeModeName = UserDefaults.standard.string(forKey: Self.colorSchemeModeKey)
            ?? PlaybackDefaults.colorSchemeMode
    }

    // MARK: - Public API

    /// Update accent color — persists to cache and Convex.
    func setAccentColor(_ name: String) {
        lastLocalChangeAt = Date()
        accentColorName = name
        UserDefaults.standard.set(name, forKey: Self.accentColorKey)
        preferencesRepository.updatePreferences(accentColor: name)
    }

    /// Update color scheme mode — persists to cache and Convex.
    func setColorSchemeMode(_ mode: String) {
        lastLocalChangeAt = Date()
        colorSchemeModeName = mode
        UserDefaults.standard.set(mode, forKey: Self.colorSchemeModeKey)
        preferencesRepository.updatePreferences(colorSchemeMode: mode)
    }

    /// Apply preferences received from the Convex subscription.
    /// Called from MainView's preference sink to sync cloud → local.
    /// Skips updates during a cooldown window after local changes to avoid
    /// reverting optimistic writes with stale subscription data.
    func applyPreferences(_ prefs: UserPreferences?) {
        guard Date().timeIntervalSince(lastLocalChangeAt) > Self.syncCooldown else { return }

        let accent = prefs?.accentColor ?? PlaybackDefaults.accentColor
        let scheme = prefs?.colorSchemeMode ?? PlaybackDefaults.colorSchemeMode

        if accentColorName != accent {
            accentColorName = accent
            UserDefaults.standard.set(accent, forKey: Self.accentColorKey)
        }
        if colorSchemeModeName != scheme {
            colorSchemeModeName = scheme
            UserDefaults.standard.set(scheme, forKey: Self.colorSchemeModeKey)
        }
    }
}
