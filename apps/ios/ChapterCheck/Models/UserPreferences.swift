import Foundation

/// Playback preferences synced from the `userPreferences` Convex table.
/// All preference fields are optional — the app falls back to `PlaybackDefaults`.
struct UserPreferences: Decodable, Sendable {
    let _id: String
    let _creationTime: Double
    let userId: String
    let skipForwardSeconds: Double?
    let skipBackwardSeconds: Double?
    let momentumSkipEnabled: Bool?
    let smartRewindEnabled: Bool?
    let voiceBoostEnabled: Bool?
    let createdAt: Double
    let updatedAt: Double
}

/// Default values for playback preferences, matching existing hardcoded behavior.
enum PlaybackDefaults {
    static let skipForwardSeconds: Double = 30
    static let skipBackwardSeconds: Double = 15
    static let momentumSkipEnabled = true
    static let smartRewindEnabled = true
    static let voiceBoostEnabled = false
}
