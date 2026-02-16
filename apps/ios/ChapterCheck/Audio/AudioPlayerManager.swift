import AVFoundation
import Combine
import Foundation
import os
import UIKit

/// Central manager for audiobook playback.
///
/// Uses iOS 17's `@Observable` macro so SwiftUI views automatically re-render
/// when playback state changes. Orchestrates `AVPlayer`, `NowPlayingManager`,
/// `AudioSessionManager`, and `StreamURLCache` to provide a complete playback
/// experience including:
///
/// - Streaming from presigned R2 URLs via `StreamURLCache`
/// - Multi-part book support with automatic part advancement
/// - Lock screen / Control Center integration via `NowPlayingManager`
/// - Periodic progress saving to Convex (every 10s, on pause, on background)
/// - Background audio and interruption handling via `AudioSessionManager`
/// - Playback rate persistence
///
/// Injected at the app root via `.environment()` so all views can access
/// the current playback state without prop drilling.
@Observable
@MainActor
final class AudioPlayerManager {

    // MARK: - Playback State

    /// Whether audio is currently playing (not paused or stopped).
    private(set) var isPlaying = false

    /// The book currently loaded for playback.
    private(set) var currentBook: BookWithDetails?

    /// The audio file part currently playing.
    private(set) var currentAudioFile: AudioFile?

    /// All audio file parts for the current book, sorted by part number.
    private(set) var audioFiles: [AudioFile] = []

    /// Current playback position in seconds.
    private(set) var currentPosition: Double = 0

    /// Total duration of the current audio file in seconds.
    private(set) var duration: Double = 0

    /// Current playback rate (e.g., 1.0, 1.25, 1.5, 2.0).
    private(set) var playbackRate: Double = 1.0

    /// Whether the player is loading/buffering a new track.
    private(set) var isLoading = false

    /// A user-facing error message, or `nil` if no error has occurred.
    private(set) var error: String?

    // MARK: - Computed Properties

    /// Playback progress as a fraction (0.0 to 1.0).
    var progress: Double {
        guard duration > 0 else { return 0 }
        return min(currentPosition / duration, 1.0)
    }

    /// Whether there is a next part available.
    var hasNext: Bool {
        guard let currentAudioFile else { return false }
        guard let index = audioFiles.firstIndex(where: { $0._id == currentAudioFile._id }) else {
            return false
        }
        return index < audioFiles.count - 1
    }

    /// Whether there is a previous part available.
    var hasPrevious: Bool {
        guard let currentAudioFile else { return false }
        guard let index = audioFiles.firstIndex(where: { $0._id == currentAudioFile._id }) else {
            return false
        }
        return index > 0
    }

    /// Whether any audio content is loaded (even if paused).
    var hasContent: Bool {
        currentBook != nil
    }

    /// Current part number (1-based) and total parts, for display in multi-part books.
    /// Returns `nil` for single-part books.
    var partInfo: (current: Int, total: Int)? {
        guard let currentAudioFile, audioFiles.count > 1 else { return nil }
        guard let index = audioFiles.firstIndex(where: { $0._id == currentAudioFile._id }) else {
            return nil
        }
        return (index + 1, audioFiles.count)
    }

    /// Formatted elapsed time as "H:MM:SS" or "M:SS".
    var formattedElapsedTime: String {
        Self.formatTime(currentPosition)
    }

    /// Formatted remaining time as "-H:MM:SS" or "-M:SS".
    var formattedRemainingTime: String {
        let remaining = max(duration - currentPosition, 0)
        return "-\(Self.formatTime(remaining))"
    }

    // MARK: - Dependencies

    private let streamURLCache: StreamURLCache
    private let nowPlayingManager: NowPlayingManager
    private let sessionManager: AudioSessionManager
    private let progressRepository: ProgressRepository
    private let logger = Logger(subsystem: "com.chaptercheck", category: "AudioPlayer")

    // MARK: - Private State

    private var player: AVPlayer?
    private var timeObserver: Any?
    private var statusObservation: NSKeyValueObservation?
    private var endObservation: NSObjectProtocol?
    private var progressSaveTask: Task<Void, Never>?

    /// Minimum position change (in seconds) before saving progress to the backend.
    /// Prevents unnecessary writes when the user pauses and resumes at the same spot.
    private static let minSaveThresholdSeconds: Double = 1.0

    /// Interval between periodic progress saves during playback.
    private static let progressSaveIntervalSeconds: Double = 10.0

    /// Tracks the last saved position to avoid redundant saves.
    private var lastSavedPosition: Double = 0

    // MARK: - Initialization

    init() {
        self.streamURLCache = StreamURLCache(audioRepository: AudioRepository())
        self.nowPlayingManager = NowPlayingManager()
        self.sessionManager = AudioSessionManager()
        self.progressRepository = ProgressRepository()

        configureAudioSession()
        configureRemoteCommands()
        observeAppLifecycle()
    }

    // MARK: - Public API

    /// Start playback of a specific audio file within a book.
    ///
    /// If the same file is already loaded, seeks to `startPosition` and resumes.
    /// Otherwise, tears down the current player, fetches a presigned stream URL,
    /// and begins playback.
    ///
    /// - Parameters:
    ///   - book: The book being played.
    ///   - audioFile: The specific part to play.
    ///   - allFiles: All audio parts for this book (sorted by part number).
    ///   - startPosition: Position in seconds to start from.
    ///   - rate: Playback speed.
    func play(
        book: BookWithDetails,
        audioFile: AudioFile,
        allFiles: [AudioFile],
        startPosition: Double = 0,
        rate: Double = 1.0
    ) {
        // If already playing the same file, just seek and resume
        if currentAudioFile?._id == audioFile._id, player != nil {
            seek(to: startPosition)
            if !isPlaying { resume() }
            return
        }

        // Save progress for the outgoing track before switching
        if currentBook != nil {
            saveProgressNow()
        }

        currentBook = book
        currentAudioFile = audioFile
        audioFiles = allFiles
        playbackRate = rate
        isLoading = true
        error = nil

        // Prefetch the stream URL for the next part so transitions are seamless
        if let nextFile = nextAudioFile(after: audioFile) {
            Task { await streamURLCache.prefetch(audioFileId: nextFile._id) }
        }

        Task {
            await loadAndPlay(audioFile: audioFile, startPosition: startPosition)
        }
    }

    /// Pause playback and save progress.
    func pause() {
        player?.pause()
        isPlaying = false
        saveProgressNow()
        updateNowPlayingState()
    }

    /// Resume playback from the current position.
    func resume() {
        guard player != nil else { return }
        sessionManager.activate()
        player?.rate = Float(playbackRate)
        isPlaying = true
        startProgressSaving()
        updateNowPlayingState()
    }

    /// Toggle between playing and paused states.
    func togglePlayPause() {
        if isPlaying {
            pause()
        } else {
            resume()
        }
    }

    /// Skip forward by the specified number of seconds (default 30).
    func skipForward(_ seconds: Double = 30) {
        let target = min(currentPosition + seconds, duration)
        seek(to: target)
    }

    /// Skip backward by the specified number of seconds (default 15).
    func skipBackward(_ seconds: Double = 15) {
        let target = max(currentPosition - seconds, 0)
        seek(to: target)
    }

    /// Seek to a specific position in seconds.
    func seek(to seconds: Double) {
        let clamped = max(0, min(seconds, duration))
        let time = CMTime(seconds: clamped, preferredTimescale: 600)

        player?.seek(to: time, toleranceBefore: .zero, toleranceAfter: .zero) { [weak self] finished in
            guard finished else { return }
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.currentPosition = clamped
                self.updateNowPlayingState()
                self.saveProgressNow()
            }
        }

        // Update position immediately for responsive UI
        currentPosition = clamped
    }

    /// Change the playback rate and persist it.
    func setRate(_ rate: Double) {
        playbackRate = rate
        if isPlaying {
            player?.rate = Float(rate)
        }
        updateNowPlayingState()
        saveProgressNow()
    }

    /// Advance to the next audio part.
    func nextPart() {
        guard let currentAudioFile,
              let nextFile = nextAudioFile(after: currentAudioFile),
              let book = currentBook
        else { return }

        saveProgressNow()
        play(book: book, audioFile: nextFile, allFiles: audioFiles, startPosition: 0, rate: playbackRate)
    }

    /// Go to the previous audio part, or restart the current part.
    ///
    /// If more than 3 seconds into the current part, restarts it instead
    /// of going to the previous part. This matches standard media player behavior.
    func previousPart() {
        // If we're more than 3 seconds in, restart the current part
        if currentPosition > 3 {
            seek(to: 0)
            return
        }

        guard let currentAudioFile,
              let prevFile = previousAudioFile(before: currentAudioFile),
              let book = currentBook
        else {
            seek(to: 0)
            return
        }

        saveProgressNow()
        play(book: book, audioFile: prevFile, allFiles: audioFiles, startPosition: 0, rate: playbackRate)
    }

    /// Play a specific part by its audio file.
    func playPart(_ audioFile: AudioFile) {
        guard let book = currentBook else { return }
        play(book: book, audioFile: audioFile, allFiles: audioFiles, startPosition: 0, rate: playbackRate)
    }

    /// Stop playback and clear all state.
    func stop() {
        saveProgressNow()
        teardownPlayer()

        currentBook = nil
        currentAudioFile = nil
        audioFiles = []
        currentPosition = 0
        duration = 0
        isPlaying = false
        isLoading = false
        error = nil
        lastSavedPosition = 0

        nowPlayingManager.clearNowPlayingInfo()
        sessionManager.deactivate()
    }

    // MARK: - Private: Loading & Playing

    private func loadAndPlay(audioFile: AudioFile, startPosition: Double) async {
        do {
            let url = try await streamURLCache.getUrl(audioFileId: audioFile._id)

            teardownPlayer()

            let playerItem = AVPlayerItem(url: url)
            let avPlayer = AVPlayer(playerItem: playerItem)
            avPlayer.automaticallyWaitsToMinimizeStalling = true

            player = avPlayer

            observePlayerStatus(avPlayer, startPosition: startPosition)
            observePlaybackTime(avPlayer)
            observePlaybackEnd(playerItem)

        } catch {
            self.error = "Unable to load audio. Please try again."
            isLoading = false
            logger.error("Failed to load stream URL: \(error.localizedDescription)")
        }
    }

    // MARK: - Private: Player Observations

    private func observePlayerStatus(_ avPlayer: AVPlayer, startPosition: Double) {
        statusObservation = avPlayer.currentItem?.observe(\.status, options: [.new]) { [weak self] item, _ in
            Task { @MainActor [weak self] in
                guard let self else { return }

                switch item.status {
                case .readyToPlay:
                    let itemDuration = item.duration.seconds
                    if itemDuration.isFinite && itemDuration > 0 {
                        self.duration = itemDuration
                    } else {
                        self.duration = self.currentAudioFile?.duration ?? 0
                    }

                    if startPosition > 0 {
                        self.seek(to: startPosition)
                    }

                    self.sessionManager.activate()
                    avPlayer.rate = Float(self.playbackRate)
                    self.isPlaying = true
                    self.isLoading = false
                    self.lastSavedPosition = self.currentPosition

                    self.startProgressSaving()
                    self.updateNowPlayingFull()
                    self.nowPlayingManager.updateTrackCommands(
                        hasNext: self.hasNext,
                        hasPrevious: self.hasPrevious
                    )
                    self.loadCoverArtwork()

                case .failed:
                    self.error = "Failed to load audio. Please try again."
                    self.isLoading = false
                    self.logger.error("Player item failed: \(item.error?.localizedDescription ?? "unknown")")

                default:
                    break
                }
            }
        }
    }

    private func observePlaybackTime(_ avPlayer: AVPlayer) {
        let interval = CMTime(seconds: 0.5, preferredTimescale: 600)
        timeObserver = avPlayer.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            Task { @MainActor [weak self] in
                guard let self else { return }
                let seconds = time.seconds
                if seconds.isFinite {
                    self.currentPosition = seconds
                }
            }
        }
    }

    private func observePlaybackEnd(_ playerItem: AVPlayerItem) {
        endObservation = NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: playerItem,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.logger.info("Playback ended for '\(self.currentAudioFile?.displayName ?? "unknown")'")

                // Save final position at the end of the track
                self.currentPosition = self.duration
                self.saveProgressNow()

                // Auto-advance to next part if available
                if self.hasNext {
                    self.logger.info("Auto-advancing to next part")
                    self.nextPart()
                } else {
                    self.logger.info("No more parts - playback complete")
                    self.isPlaying = false
                    self.updateNowPlayingState()
                }
            }
        }
    }

    // MARK: - Private: Teardown

    private func teardownPlayer() {
        if let timeObserver, let player {
            player.removeTimeObserver(timeObserver)
        }
        timeObserver = nil

        statusObservation?.invalidate()
        statusObservation = nil

        if let endObservation {
            NotificationCenter.default.removeObserver(endObservation)
        }
        endObservation = nil

        player?.pause()
        player = nil

        stopProgressSaving()
    }

    // MARK: - Private: Progress Saving

    private func startProgressSaving() {
        stopProgressSaving()

        progressSaveTask = Task { [weak self] in
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(Self.progressSaveIntervalSeconds))
                guard !Task.isCancelled else { return }

                await MainActor.run { [weak self] in
                    self?.saveProgressIfChanged()
                }
            }
        }
    }

    private func stopProgressSaving() {
        progressSaveTask?.cancel()
        progressSaveTask = nil
    }

    /// Save progress only if the position has changed meaningfully since the last save.
    private func saveProgressIfChanged() {
        let delta = abs(currentPosition - lastSavedPosition)
        guard delta >= Self.minSaveThresholdSeconds else { return }
        saveProgressNow()
    }

    /// Immediately save the current progress to the backend.
    private func saveProgressNow() {
        guard
            let book = currentBook,
            let audioFile = currentAudioFile,
            currentPosition > 0,
            duration > 0,
            currentPosition <= duration,
            playbackRate > 0
        else {
            return
        }

        let bookId = book._id
        let audioFileId = audioFile._id
        let position = currentPosition
        let rate = playbackRate

        lastSavedPosition = position

        Task { @MainActor [weak self] in
            guard let self else { return }
            do {
                try await self.progressRepository.saveProgress(
                    bookId: bookId,
                    audioFileId: audioFileId,
                    positionSeconds: position,
                    playbackRate: rate
                )
            } catch {
                self.logger.error("Failed to save progress: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Private: Now Playing

    private func updateNowPlayingFull() {
        guard let book = currentBook, let audioFile = currentAudioFile else { return }

        let title: String
        if audioFiles.count > 1, let displayName = audioFile.displayName {
            title = "\(book.title) - \(displayName)"
        } else {
            title = book.title
        }

        let artist = book.authors.map(\.name).joined(separator: ", ")

        nowPlayingManager.updateNowPlayingInfo(
            title: title,
            artist: artist.isEmpty ? "Unknown Author" : artist,
            duration: duration,
            elapsedTime: currentPosition,
            playbackRate: isPlaying ? playbackRate : 0
        )
    }

    private func updateNowPlayingState() {
        nowPlayingManager.updatePlaybackPosition(
            elapsedTime: currentPosition,
            playbackRate: isPlaying ? playbackRate : 0
        )
    }

    private func loadCoverArtwork() {
        guard let coverKey = currentBook?.coverImageR2Key else { return }

        Task {
            if let url = await ImageRepository.shared.getImageUrl(r2Key: coverKey) {
                await MainActor.run {
                    self.nowPlayingManager.loadArtwork(from: url.absoluteString)
                }
            }
        }
    }

    // MARK: - Private: Audio Session & Remote Commands

    private func configureAudioSession() {
        sessionManager.configure()

        sessionManager.onInterruption = { [weak self] shouldResume in
            Task { @MainActor in
                guard let self else { return }
                if shouldResume {
                    self.resume()
                } else {
                    // Interruption began or ended without resume flag
                    self.player?.pause()
                    self.isPlaying = false
                    self.saveProgressNow()
                    self.updateNowPlayingState()
                }
            }
        }
    }

    private func configureRemoteCommands() {
        nowPlayingManager.handlers = NowPlayingManager.CommandHandlers(
            onPlay: { [weak self] in
                Task { @MainActor in self?.resume() }
            },
            onPause: { [weak self] in
                Task { @MainActor in self?.pause() }
            },
            onTogglePlayPause: { [weak self] in
                Task { @MainActor in self?.togglePlayPause() }
            },
            onSkipForward: { [weak self] in
                Task { @MainActor in self?.skipForward() }
            },
            onSkipBackward: { [weak self] in
                Task { @MainActor in self?.skipBackward() }
            },
            onSeek: { [weak self] position in
                Task { @MainActor in self?.seek(to: position) }
            },
            onNextTrack: { [weak self] in
                Task { @MainActor in self?.nextPart() }
            },
            onPreviousTrack: { [weak self] in
                Task { @MainActor in self?.previousPart() }
            }
        )
    }

    private func observeAppLifecycle() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillResignActive),
            name: UIApplication.willResignActiveNotification,
            object: nil
        )

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: UIApplication.didBecomeActiveNotification,
            object: nil
        )
    }

    @objc
    private func appWillResignActive() {
        // Save progress and update lock screen when app backgrounds
        if isPlaying {
            saveProgressNow()
            updateNowPlayingFull()
        }
    }

    @objc
    private func appDidBecomeActive() {
        // Sync UI state with actual player state when returning to foreground.
        // The player may have been paused by the system or by the user via
        // lock screen controls while the app was in the background.
        if let player {
            let playerIsPlaying = player.rate > 0
            if isPlaying != playerIsPlaying {
                isPlaying = playerIsPlaying
            }
        }
    }

    // MARK: - Private: Part Navigation Helpers

    private func nextAudioFile(after file: AudioFile) -> AudioFile? {
        guard let index = audioFiles.firstIndex(where: { $0._id == file._id }) else { return nil }
        let nextIndex = index + 1
        guard nextIndex < audioFiles.count else { return nil }
        return audioFiles[nextIndex]
    }

    private func previousAudioFile(before file: AudioFile) -> AudioFile? {
        guard let index = audioFiles.firstIndex(where: { $0._id == file._id }) else { return nil }
        let prevIndex = index - 1
        guard prevIndex >= 0 else { return nil }
        return audioFiles[prevIndex]
    }

    // MARK: - Private: Formatting

    private static func formatTime(_ totalSeconds: Double) -> String {
        guard totalSeconds.isFinite && totalSeconds >= 0 else { return "0:00" }
        let total = Int(totalSeconds)
        let hours = total / 3600
        let minutes = (total % 3600) / 60
        let seconds = total % 60

        if hours > 0 {
            return "\(hours):\(String(format: "%02d", minutes)):\(String(format: "%02d", seconds))"
        }
        return "\(minutes):\(String(format: "%02d", seconds))"
    }
}
