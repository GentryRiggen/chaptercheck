import Foundation
import MediaPlayer
import os

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

    private let logger = Logger(subsystem: "com.chaptercheck", category: "NowPlaying")

    /// Skip interval in seconds for the forward command (30s, matching the app UI).
    private let skipForwardInterval: TimeInterval = 30

    /// Skip interval in seconds for the backward command (15s, matching the app UI).
    private let skipBackwardInterval: TimeInterval = 15

    /// Cached artwork image to avoid regenerating it on every info update.
    private var cachedArtwork: MPMediaItemArtwork?
    private var cachedArtworkUrlString: String?
    private var loadArtworkTask: Task<Void, Never>?

    init() {
        registerRemoteCommands()
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

        // Play / Pause
        center.playCommand.isEnabled = true
        center.playCommand.addTarget { [weak self] _ in
            self?.handlers.onPlay()
            return .success
        }

        center.pauseCommand.isEnabled = true
        center.pauseCommand.addTarget { [weak self] _ in
            self?.handlers.onPause()
            return .success
        }

        center.togglePlayPauseCommand.isEnabled = true
        center.togglePlayPauseCommand.addTarget { [weak self] _ in
            self?.handlers.onTogglePlayPause()
            return .success
        }

        // Skip Forward (30s)
        center.skipForwardCommand.isEnabled = true
        center.skipForwardCommand.preferredIntervals = [NSNumber(value: skipForwardInterval)]
        center.skipForwardCommand.addTarget { [weak self] _ in
            self?.handlers.onSkipForward()
            return .success
        }

        // Skip Backward (15s)
        center.skipBackwardCommand.isEnabled = true
        center.skipBackwardCommand.preferredIntervals = [NSNumber(value: skipBackwardInterval)]
        center.skipBackwardCommand.addTarget { [weak self] _ in
            self?.handlers.onSkipBackward()
            return .success
        }

        // Seek (scrubbing on lock screen)
        center.changePlaybackPositionCommand.isEnabled = true
        center.changePlaybackPositionCommand.addTarget { [weak self] event in
            guard let positionEvent = event as? MPChangePlaybackPositionCommandEvent else {
                return .commandFailed
            }
            self?.handlers.onSeek(positionEvent.positionTime)
            return .success
        }

        // Next / Previous Track (for multi-part books)
        center.nextTrackCommand.isEnabled = false
        center.nextTrackCommand.addTarget { [weak self] _ in
            self?.handlers.onNextTrack()
            return .success
        }

        center.previousTrackCommand.isEnabled = false
        center.previousTrackCommand.addTarget { [weak self] _ in
            self?.handlers.onPreviousTrack()
            return .success
        }
    }

    /// Enable or disable the next/previous track commands based on whether
    /// there are adjacent parts available.
    func updateTrackCommands(hasNext: Bool, hasPrevious: Bool) {
        let center = MPRemoteCommandCenter.shared()
        center.nextTrackCommand.isEnabled = hasNext
        center.previousTrackCommand.isEnabled = hasPrevious
    }
}
