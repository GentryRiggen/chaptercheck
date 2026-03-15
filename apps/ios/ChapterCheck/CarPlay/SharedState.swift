import Foundation

/// Weak references to the app's singleton managers so the CarPlay scene
/// can access the same `AudioPlayerManager` and `DownloadManager` instances
/// owned by `MainView`.
///
/// `MainView` sets these in its `.task` modifier. The CarPlay scene delegate
/// reads them to control playback and browse downloads.
@MainActor
enum SharedState {
    static weak var audioPlayer: AudioPlayerManager?
    static weak var downloadManager: DownloadManager?
}
