import AVFoundation
import Foundation
import os

/// Manages the shared `AVAudioSession` for audiobook playback.
///
/// Configures the session for spoken audio with the `.playback` category so
/// audio continues when the app is backgrounded or the screen is locked.
/// Also handles interruptions (phone calls, Siri, other apps) by pausing and
/// resuming playback through a delegate callback.
final class AudioSessionManager {

    /// Callback invoked when an audio interruption occurs.
    /// - Parameter shouldResume: `true` if playback should resume after the interruption ended.
    var onInterruption: ((_ shouldResume: Bool) -> Void)?

    private let logger = Logger(subsystem: "com.chaptercheck", category: "AudioSession")

    init() {
        registerForInterruptions()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Configuration

    /// Configure and activate the audio session.
    ///
    /// Call this once at app launch (e.g., in `ChapterCheckApp.init()`).
    /// The `.playback` category with `.spokenAudio` mode enables:
    /// - Background audio playback
    /// - Lock screen controls via `MPNowPlayingInfoCenter`
    /// - Proper ducking behavior from other apps
    func configure() {
        let session = AVAudioSession.sharedInstance()

        do {
            try session.setCategory(
                .playback,
                mode: .spokenAudio,
                options: []
            )
            logger.info("Audio session configured: category=playback, mode=spokenAudio")
        } catch {
            logger.error("Failed to configure audio session: \(error.localizedDescription)")
        }
    }

    /// Activate the audio session. Call before starting playback.
    func activate() {
        do {
            try AVAudioSession.sharedInstance().setActive(true)
            logger.debug("Audio session activated")
        } catch {
            logger.error("Failed to activate audio session: \(error.localizedDescription)")
        }
    }

    /// Deactivate the audio session. Call when playback is fully stopped
    /// and no audio will resume soon, to allow other apps to use audio.
    func deactivate() {
        do {
            try AVAudioSession.sharedInstance().setActive(
                false,
                options: .notifyOthersOnDeactivation
            )
            logger.debug("Audio session deactivated")
        } catch {
            // Deactivation can fail if another audio source is active; this is expected.
            logger.debug("Audio session deactivation skipped: \(error.localizedDescription)")
        }
    }

    // MARK: - Interruption Handling

    private func registerForInterruptions() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption(_:)),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    @objc
    private func handleInterruption(_ notification: Notification) {
        guard
            let userInfo = notification.userInfo,
            let typeValue = userInfo[AVAudioSessionInterruptionTypeKey] as? UInt,
            let type = AVAudioSession.InterruptionType(rawValue: typeValue)
        else {
            return
        }

        switch type {
        case .began:
            logger.info("Audio interruption began")
            onInterruption?(false)

        case .ended:
            let optionsValue = userInfo[AVAudioSessionInterruptionOptionKey] as? UInt ?? 0
            let options = AVAudioSession.InterruptionOptions(rawValue: optionsValue)
            let shouldResume = options.contains(.shouldResume)
            logger.info("Audio interruption ended, shouldResume=\(shouldResume)")
            onInterruption?(shouldResume)

        @unknown default:
            logger.warning("Unknown audio interruption type: \(typeValue)")
        }
    }
}
