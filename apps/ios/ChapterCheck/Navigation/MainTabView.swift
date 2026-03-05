import Combine
import ClerkKit
import SwiftUI

// MARK: - Show Now Playing Environment Key

/// Callable wrapper so `@Environment(\.showNowPlaying)` works with SwiftUI's key-path init.
struct ShowNowPlayingAction {
    private let action: () -> Void

    init(_ action: @escaping () -> Void = {}) {
        self.action = action
    }

    func callAsFunction() {
        action()
    }
}

private struct ShowNowPlayingKey: EnvironmentKey {
    static let defaultValue = ShowNowPlayingAction()
}

// MARK: - Navigate to Destination Environment Key

/// Dismisses the Now Playing sheet and navigates to a destination in the NavigationStack.
struct NavigateToDestinationAction {
    private let action: (AppDestination) -> Void

    init(_ action: @escaping (AppDestination) -> Void = { _ in }) {
        self.action = action
    }

    func callAsFunction(_ destination: AppDestination) {
        action(destination)
    }
}

private struct NavigateToDestinationKey: EnvironmentKey {
    static let defaultValue = NavigateToDestinationAction()
}

// MARK: - Show Settings Environment Key

/// Callable wrapper for presenting the settings sheet from child views.
struct ShowSettingsAction {
    private let action: () -> Void

    init(_ action: @escaping () -> Void = {}) {
        self.action = action
    }

    func callAsFunction() {
        action()
    }
}

private struct ShowSettingsKey: EnvironmentKey {
    static let defaultValue = ShowSettingsAction()
}

extension EnvironmentValues {
    var showNowPlaying: ShowNowPlayingAction {
        get { self[ShowNowPlayingKey.self] }
        set { self[ShowNowPlayingKey.self] = newValue }
    }

    var navigateToDestination: NavigateToDestinationAction {
        get { self[NavigateToDestinationKey.self] }
        set { self[NavigateToDestinationKey.self] = newValue }
    }

    var showSettings: ShowSettingsAction {
        get { self[ShowSettingsKey.self] }
        set { self[ShowSettingsKey.self] = newValue }
    }
}

/// Primary single-stack navigation after authentication.
///
/// Owns the `AudioPlayerManager` as `@State` and injects it into the
/// environment so all child views can access playback state. A persistent
/// `MiniPlayerView` overlay is shown at the bottom when audio is loaded.
struct MainView: View {
    @State private var navigationPath = NavigationPath()
    @State private var audioPlayer = AudioPlayerManager()
    @State private var downloadManager = DownloadManager()
    @State private var isNowPlayingPresented = false
    @State private var isSettingsPresented = false
    @State private var pendingNavigation: AppDestination?
    @State private var preferencesCancellable: AnyCancellable?
    @Environment(ThemeManager.self) private var themeManager
    private let networkMonitor = NetworkMonitor.shared

    var body: some View {
        ZStack(alignment: .bottom) {
            NavigationStack(path: $navigationPath) {
                if networkMonitor.isConnected {
                    HomeView()
                        .navigationDestination(for: AppDestination.self) { destination in
                            destinationView(for: destination)
                        }
                } else {
                    OfflineHomeView()
                        .navigationDestination(for: AppDestination.self) { destination in
                            destinationView(for: destination)
                        }
                }
            }

            if audioPlayer.hasContent {
                MiniPlayerView(isNowPlayingPresented: $isNowPlayingPresented)
                    .padding(.horizontal, 8)
            }
        }
        .environment(audioPlayer)
        .environment(downloadManager)
        .environment(\.showNowPlaying, ShowNowPlayingAction { isNowPlayingPresented = true })
        .environment(\.navigateToDestination, navigateAction)
        .environment(\.showSettings, ShowSettingsAction { isSettingsPresented = true })
        .task {
            await downloadManager.initialize()
            audioPlayer.downloadManager = downloadManager

            if networkMonitor.isConnected {
                subscribeToPreferences()
                await OfflineProgressQueue.shared.flush()
                Task { await downloadManager.refreshDownloadedBookMetadata() }
            }
        }
        .onChange(of: networkMonitor.isConnected) { wasConnected, isConnected in
            if !wasConnected && isConnected {
                subscribeToPreferences()
                Task {
                    await OfflineProgressQueue.shared.flush()
                    await downloadManager.refreshDownloadedBookMetadata()
                }
            }
        }
        .onChange(of: audioPlayer.streamingEventId) { _, newValue in
            guard newValue != nil,
                  let book = audioPlayer.streamingEventBook,
                  audioPlayer.autoDownloadOnPlay else { return }

            // Check network preference — skip on cellular if Wi-Fi only
            if audioPlayer.downloadNetwork == "wifi" && networkMonitor.isExpensive { return }

            downloadManager.downloadBook(book: book, audioFiles: audioPlayer.streamingEventAudioFiles)
        }
        .sheet(isPresented: $isNowPlayingPresented, onDismiss: {
            if let pending = pendingNavigation {
                pendingNavigation = nil
                navigationPath.append(pending)
            }
        }) {
            NowPlayingView()
                .environment(audioPlayer)
                .environment(downloadManager)
                .environment(\.navigateToDestination, navigateAction)
                .preferredColorScheme(themeManager.preferredColorScheme)
        }
        .sheet(isPresented: $isSettingsPresented) {
            SettingsView()
                .environment(downloadManager)
                .preferredColorScheme(themeManager.preferredColorScheme)
        }
    }

    private var navigateAction: NavigateToDestinationAction {
        NavigateToDestinationAction { destination in
            pendingNavigation = destination
            isNowPlayingPresented = false
        }
    }

    private func subscribeToPreferences() {
        guard preferencesCancellable == nil,
              let publisher = PreferencesRepository().subscribeToPreferences() else { return }

        preferencesCancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { completion in
                    if case .failure = completion {
                        // Subscription ended — player continues with cached/default preferences
                    }
                },
                receiveValue: { [audioPlayer, themeManager] prefs in
                    audioPlayer.applyPreferences(prefs)
                    themeManager.applyPreferences(prefs)
                }
            )
    }

    // MARK: - Navigation Destination

    @ViewBuilder
    private func destinationView(for destination: AppDestination) -> some View {
        switch destination {
        case .book(let id):
            BookDetailView(bookId: id)
        case .author(let id):
            AuthorDetailView(authorId: id)
        case .series(let id):
            SeriesDetailView(seriesId: id)
        case .shelf(let id):
            ShelfDetailView(shelfId: id)
        case .profile(let userId):
            ProfileView(userId: userId)
        case .search:
            SearchView()
        case .browseLibrary(let initialSort):
            LibraryView(initialSort: initialSort)
        case .browseAuthors:
            AuthorsView()
        case .offlineBook(let bookId):
            OfflineBookDetailView(bookId: bookId)
        }
    }
}

#Preview {
    MainView()
}
