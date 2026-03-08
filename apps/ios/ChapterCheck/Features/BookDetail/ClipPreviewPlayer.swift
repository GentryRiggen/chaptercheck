import AVFoundation
import Foundation

@MainActor
@Observable
final class ClipPreviewPlayer {
    private let streamURLCache = StreamURLCache(audioRepository: AudioRepository())
    private var player: AVPlayer?
    private var timeObserver: Any?
    private var endBoundaryObserver: Any?

    private(set) var isPlaying = false
    private(set) var isLoading = false
    private(set) var currentTime: Double = 0
    private(set) var errorMessage: String?
    private(set) var duration: Double = 0

    private var activeAudioFileId: String?
    private var activeStartSeconds: Double = 0
    private var activeEndSeconds: Double = 0

    func playClip(
        audioFileId: String,
        localFileURL: URL?,
        startSeconds: Double,
        endSeconds: Double
    ) async {
        errorMessage = nil

        if activeAudioFileId == audioFileId,
           activeStartSeconds == startSeconds,
           activeEndSeconds == endSeconds,
           let player {
            player.play()
            isPlaying = true
            return
        }

        stop()
        isLoading = true

        do {
            let url = if let localFileURL {
                localFileURL
            } else {
                try await streamURLCache.getUrl(audioFileId: audioFileId)
            }
            guard !Task.isCancelled else { return }

            let item = AVPlayerItem(url: url)
            let player = AVPlayer(playerItem: item)
            self.player = player
            self.activeAudioFileId = audioFileId
            self.activeStartSeconds = startSeconds
            self.activeEndSeconds = endSeconds
            self.duration = max(endSeconds - startSeconds, 0)

            let interval = CMTime(seconds: 0.2, preferredTimescale: 600)
            timeObserver = player.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
                let elapsed = max(time.seconds - startSeconds, 0)
                Task { @MainActor [weak self] in
                    self?.currentTime = min(elapsed, max(endSeconds - startSeconds, 0))
                }
            }

            endBoundaryObserver = player.addBoundaryTimeObserver(
                forTimes: [NSValue(time: CMTime(seconds: endSeconds, preferredTimescale: 600))],
                queue: .main
            ) { [weak self] in
                Task { @MainActor [weak self] in
                    self?.stop()
                }
            }

            player.seek(to: CMTime(seconds: startSeconds, preferredTimescale: 600), toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
                guard finished else { return }
                Task { @MainActor [weak self] in
                    guard let self else { return }
                    self.isLoading = false
                    self.isPlaying = true
                    player.play()
                }
            }
        } catch {
            isLoading = false
            isPlaying = false
            errorMessage = error.localizedDescription
        }
    }

    func pause() {
        player?.pause()
        isPlaying = false
    }

    func seek(toRelativeSeconds seconds: Double) {
        guard let player else { return }

        let clampedSeconds = min(max(seconds, 0), max(duration, 0))
        let targetTime = CMTime(seconds: activeStartSeconds + clampedSeconds, preferredTimescale: 600)
        let shouldResume = isPlaying

        player.seek(to: targetTime, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
            guard finished else { return }
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.currentTime = clampedSeconds
                if shouldResume {
                    player.play()
                    self.isPlaying = true
                }
            }
        }
    }

    func skip(by deltaSeconds: Double) {
        seek(toRelativeSeconds: currentTime + deltaSeconds)
    }

    func stop() {
        player?.pause()

        if let timeObserver, let player {
            player.removeTimeObserver(timeObserver)
        }
        if let endBoundaryObserver, let player {
            player.removeTimeObserver(endBoundaryObserver)
        }

        timeObserver = nil
        endBoundaryObserver = nil
        player = nil
        isPlaying = false
        isLoading = false
        currentTime = 0
        duration = 0
        activeAudioFileId = nil
        activeStartSeconds = 0
        activeEndSeconds = 0
    }
}
