import AVFoundation
import Foundation

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

    /// Callback invoked when the audio output route changes.
    /// - Parameter deviceName: The name of the current output device, or `nil` for built-in speaker.
    var onRouteChange: ((_ deviceName: String?) -> Void)?

    private let logger = AppLogger(category: "AudioSession")

    init() {
        registerForInterruptions()
        registerForRouteChanges()
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    /// Returns the current output device name, or `nil` if using the built-in speaker/earpiece.
    func currentOutputDeviceName() -> String? {
        let route = AVAudioSession.sharedInstance().currentRoute
        guard let output = route.outputs.first else { return nil }
        let builtInTypes: Set<AVAudioSession.Port> = [.builtInSpeaker, .builtInReceiver]
        if builtInTypes.contains(output.portType) { return nil }
        return output.portName
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

    private func registerForRouteChanges() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange(_:)),
            name: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    @objc
    private func handleRouteChange(_ notification: Notification) {
        let deviceName = currentOutputDeviceName()
        logger.info("Audio route changed, output device: \(deviceName ?? "built-in speaker")")
        DispatchQueue.main.async { [weak self] in
            self?.onRouteChange?(deviceName)
        }
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
