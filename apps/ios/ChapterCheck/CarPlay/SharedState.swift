import Foundation

/// Weak references to the app's singleton managers so the CarPlay scene
/// can access the same instances.
///
/// `audioPlayer` now points to the `AudioPlayerManager.shared` singleton
/// directly. `downloadManager` is still set by `MainView` in its `.task`
/// modifier because `DownloadManager` is view-scoped.
@MainActor
enum SharedState {
    static var audioPlayer: AudioPlayerManager { .shared }
    static weak var downloadManager: DownloadManager?
}
