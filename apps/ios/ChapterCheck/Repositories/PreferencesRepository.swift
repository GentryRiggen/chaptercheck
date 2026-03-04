import Combine
import ConvexMobile
import Foundation

/// Repository for user playback preferences queries and mutations.
///
/// Preferences are stored per-user in the `userPreferences` table.
/// The backend upserts on update, so repeated calls are idempotent.
@MainActor
final class PreferencesRepository {

    private let convex: ConvexService

    init(convex: ConvexService = .shared) {
        self.convex = convex
    }

    // MARK: - Reactive Subscriptions

    /// Subscribe to the current user's playback preferences.
    /// Emits `nil` when no preferences have been saved.
    func subscribeToPreferences() -> AnyPublisher<UserPreferences?, ClientError>? {
        convex.subscribe(to: "userPreferences/queries:getMyPreferences")
    }

    // MARK: - Mutations

    /// Update one or more playback preferences. Only non-nil fields are sent.
    func updatePreferences(
        skipForwardSeconds: Double? = nil,
        skipBackwardSeconds: Double? = nil,
        momentumSkipEnabled: Bool? = nil,
        smartRewindEnabled: Bool? = nil,
        voiceBoostEnabled: Bool? = nil,
        accentColor: String? = nil,
        colorSchemeMode: String? = nil
    ) {
        var args: [String: ConvexEncodable?] = [:]
        if let skipForwardSeconds { args["skipForwardSeconds"] = skipForwardSeconds }
        if let skipBackwardSeconds { args["skipBackwardSeconds"] = skipBackwardSeconds }
        if let momentumSkipEnabled { args["momentumSkipEnabled"] = momentumSkipEnabled }
        if let smartRewindEnabled { args["smartRewindEnabled"] = smartRewindEnabled }
        if let voiceBoostEnabled { args["voiceBoostEnabled"] = voiceBoostEnabled }
        if let accentColor { args["accentColor"] = accentColor }
        if let colorSchemeMode { args["colorSchemeMode"] = colorSchemeMode }

        guard !args.isEmpty else { return }

        Task {
            try? await convex.mutation(
                "userPreferences/mutations:updatePreferences",
                with: args
            )
        }
    }
}
