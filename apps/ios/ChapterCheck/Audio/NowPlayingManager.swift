import Foundation
import MediaPlayer

/// Manages the lock screen / Control Center "Now Playing" info and remote commands.
///
/// Updates `MPNowPlayingInfoCenter` with the current book title, author,
/// cover artwork, elapsed time, duration, and playback rate. Registers
/// `MPRemoteCommandCenter` handlers for play, pause, skip forward/backward,
/// and scrubbing so the user can control playback without opening the app.
final class NowPlayingManager {

    /// Callbacks from remote commands back to the audio player.
    struct CommandHandlers {
        var onPlay: () -> Void = {}
        var onPause: () -> Void = {}
        var onTogglePlayPause: () -> Void = {}
        var onSkipForward: () -> Void = {}
        var onSkipBackward: () -> Void = {}
        var onSeek: (_ positionSeconds: Double) -> Void = { _ in }
        var onNextTrack: () -> Void = {}
        var onPreviousTrack: () -> Void = {}
    }

    var handlers = CommandHandlers()

    private let logger = AppLogger(category: "NowPlaying")

    /// Skip interval in seconds for the forward command.
    private var skipForwardInterval: TimeInterval = 30

    /// Skip interval in seconds for the backward command.
    private var skipBackwardInterval: TimeInterval = 15

    /// Cached artwork image to avoid regenerating it on every info update.
    private var cachedArtwork: MPMediaItemArtwork?
    private var cachedArtworkUrlString: String?
    private var loadArtworkTask: Task<Void, Never>?

    /// Tokens returned by `addTarget`, needed for cleanup in `deinit`.
    private var commandTargets: [(MPRemoteCommand, Any)] = []

    init() {
        registerRemoteCommands()
    }

    deinit {
        // Currently unreachable (owned by the AudioPlayerManager singleton),
        // but kept as a safety net: if ownership ever changes, stale command
        // targets on MPRemoteCommandCenter.shared() would cause ghost playback.
        for (command, target) in commandTargets {
            command.removeTarget(target)
        }
    }

    // MARK: - Now Playing Info

    /// Update the lock screen / Control Center metadata.
    ///
    /// Call this whenever the current track, position, or rate changes.
    /// For position updates during normal playback, the system extrapolates
    /// from `elapsedTime` + `playbackRate`, so you only need to call this
    /// when seeking, pausing, or changing rate.
    ///
    /// - Parameters:
    ///   - title: Book title (or part-specific display name).
    ///   - artist: Author name(s), comma-separated.
    ///   - duration: Total duration of the current audio file in seconds.
    ///   - elapsedTime: Current playback position in seconds.
    ///   - playbackRate: Current playback speed (0.0 when paused).
    func updateNowPlayingInfo(
        title: String,
        artist: String,
        duration: Double,
        elapsedTime: Double,
        playbackRate: Double
    ) {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist,
            MPMediaItemPropertyPlaybackDuration: duration,
            MPNowPlayingInfoPropertyElapsedPlaybackTime: elapsedTime,
            MPNowPlayingInfoPropertyPlaybackRate: playbackRate,
            MPMediaItemPropertyMediaType: MPMediaType.audioBook.rawValue,
        ]

        if let artwork = cachedArtwork {
            info[MPMediaItemPropertyArtwork] = artwork
        }

        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    /// Update just the elapsed time and playback rate without touching other fields.
    ///
    /// More efficient than `updateNowPlayingInfo` for frequent position updates.
    func updatePlaybackPosition(elapsedTime: Double, playbackRate: Double) {
        guard var info = MPNowPlayingInfoCenter.default().nowPlayingInfo else { return }
        info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = elapsedTime
        info[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    /// Load cover artwork from a URL and cache it for lock screen display.
    ///
    /// This fetches the image data asynchronously. The artwork will appear
    /// on the next call to `updateNowPlayingInfo`.
    func loadArtwork(from urlString: String) {
        // Skip if we already have this artwork cached
        if cachedArtworkUrlString == urlString, cachedArtwork != nil {
            return
        }

        cachedArtworkUrlString = urlString
        loadArtworkTask?.cancel()

        loadArtworkTask = Task { [weak self] in
            guard let url = URL(string: urlString) else { return }

            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                guard let image = UIImage(data: data) else { return }

                let artwork = MPMediaItemArtwork(boundsSize: image.size) { _ in image }

                await MainActor.run {
                    self?.cachedArtwork = artwork
                    // Update existing now playing info to include the artwork
                    if var info = MPNowPlayingInfoCenter.default().nowPlayingInfo {
                        info[MPMediaItemPropertyArtwork] = artwork
                        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
                    }
                }
            } catch {
                self?.logger.error("Failed to load artwork: \(error.localizedDescription)")
            }
        }
    }

    /// Clear the now playing info (e.g., when playback stops completely).
    func clearNowPlayingInfo() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        cachedArtwork = nil
        cachedArtworkUrlString = nil
    }

    // MARK: - Remote Command Registration

    private func registerRemoteCommands() {
        let center = MPRemoteCommandCenter.shared()

        func register(_ command: MPRemoteCommand, handler: @escaping (MPRemoteCommandEvent) -> MPRemoteCommandHandlerStatus) {
            command.isEnabled = true
            let target = command.addTarget(handler: handler)
            commandTargets.append((command, target))
        }

        // Play / Pause
        register(center.playCommand) { [weak self] _ in
            self?.handlers.onPlay()
            return .success
        }

        register(center.pauseCommand) { [weak self] _ in
            self?.handlers.onPause()
            return .success
        }

        register(center.togglePlayPauseCommand) { [weak self] _ in
            self?.handlers.onTogglePlayPause()
            return .success
        }

        // Skip Forward (30s)
        center.skipForwardCommand.preferredIntervals = [NSNumber(value: skipForwardInterval)]
        register(center.skipForwardCommand) { [weak self] _ in
            self?.handlers.onSkipForward()
            return .success
        }

        // Skip Backward (15s)
        center.skipBackwardCommand.preferredIntervals = [NSNumber(value: skipBackwardInterval)]
        register(center.skipBackwardCommand) { [weak self] _ in
            self?.handlers.onSkipBackward()
            return .success
        }

        // Show scrub bar but don't allow interaction
        center.changePlaybackPositionCommand.isEnabled = false
        let scrubTarget = center.changePlaybackPositionCommand.addTarget { _ in .commandFailed }
        commandTargets.append((center.changePlaybackPositionCommand, scrubTarget))

        // Next / Previous Track (AirPods double/triple-click → skip forward/backward)
        register(center.nextTrackCommand) { [weak self] _ in
            self?.handlers.onNextTrack()
            return .success
        }

        register(center.previousTrackCommand) { [weak self] _ in
            self?.handlers.onPreviousTrack()
            return .success
        }
    }

    /// Update the skip intervals shown on the lock screen / Control Center.
    func updateSkipIntervals(forward: TimeInterval, backward: TimeInterval) {
        skipForwardInterval = forward
        skipBackwardInterval = backward

        let center = MPRemoteCommandCenter.shared()
        center.skipForwardCommand.preferredIntervals = [NSNumber(value: forward)]
        center.skipBackwardCommand.preferredIntervals = [NSNumber(value: backward)]
    }
}
