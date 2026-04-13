import Combine
import ClerkKit
import ConvexMobile
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

// MARK: - Push Destination Environment Key

/// Pushes a destination onto the active tab's NavigationStack path directly.
struct PushDestinationAction {
    private let action: (AppDestination) -> Void

    init(_ action: @escaping (AppDestination) -> Void = { _ in }) {
        self.action = action
    }

    func callAsFunction(_ destination: AppDestination) {
        action(destination)
    }
}

private struct PushDestinationKey: EnvironmentKey {
    static let defaultValue = PushDestinationAction()
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

    var pushDestination: PushDestinationAction {
        get { self[PushDestinationKey.self] }
        set { self[PushDestinationKey.self] = newValue }
    }
}

// MARK: - Tab Enum

enum Tab: Int, Hashable {
    case home
    case library
    case social
    case notes
    case profile
}

/// Primary tab-based navigation after authentication.
///
/// Injects the `AudioPlayerManager.shared` singleton into the SwiftUI
/// environment so all child views can access playback state. A persistent
/// `MiniPlayerView` overlay is shown at the bottom above the tab bar.
/// A `ToastView` overlay sits above the mini player for transient notifications.
struct MainView: View {
    @State private var selectedTab: Tab = .home
    @State private var homePath: [AppDestination] = []
    @State private var libraryPath: [AppDestination] = []
    @State private var socialPath: [AppDestination] = []
    @State private var notesPath: [AppDestination] = []
    @State private var profilePath: [AppDestination] = []

    private var audioPlayer: AudioPlayerManager { .shared }
    @State private var downloadManager = DownloadManager()
    @State private var currentUserProvider = CurrentUserProvider()
    @State private var genreProvider = GenreProvider()
    @State private var tagProvider = TagProvider()
    @State private var isNowPlayingPresented = false
    @State private var isSettingsPresented = false
    @State private var currentToast: ToastMessage?
    @State private var pendingNavigation: AppDestination?
    @State private var preferencesCancellable: AnyCancellable?
    @State private var showDeletePartConfirmation = false
    @State private var completedPartAudioFileId: String?
    @State private var completedPartBookId: String?
    @State private var showDeleteDownloadConfirmation = false
    @State private var deleteDownloadBookId: String?
    @State private var stopStreamingTask: Task<Void, Never>?
    @Environment(ThemeManager.self) private var themeManager
    @Environment(DeepLinkRouter.self) private var deepLinkRouter
    private let networkMonitor = NetworkMonitor.shared

    /// The navigation path binding for the currently selected tab.
    private var activePathBinding: Binding<[AppDestination]> {
        switch selectedTab {
        case .home: return $homePath
        case .library: return $libraryPath
        case .social: return $socialPath
        case .notes: return $notesPath
        case .profile: return $profilePath
        }
    }

    var body: some View {
        ZStack(alignment: .bottom) {
            // Pending-approval banner — floats at the top of the screen (above the
            // TabView content, below the status bar) when the account is awaiting approval.
            if currentUserProvider.currentUser?.permissions.isPending == true {
                VStack(spacing: 0) {
                    pendingApprovalBanner
                    Spacer()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
                .zIndex(50)
                .allowsHitTesting(false) // Banner is informational; don't block taps on content below
            }

            TabView(selection: $selectedTab) {
                SwiftUI.Tab("Home", systemImage: "house", value: Tab.home) {
                    NavigationStack(path: $homePath) {
                        HomeView()
                            .navigationDestination(for: AppDestination.self) { destination in
                                destinationView(for: destination)
                            }
                    }
                }

                SwiftUI.Tab("Library", systemImage: "books.vertical", value: Tab.library) {
                    NavigationStack(path: $libraryPath) {
                        LibraryView()
                            .navigationDestination(for: AppDestination.self) { destination in
                                destinationView(for: destination)
                            }
                    }
                }

                SwiftUI.Tab("Social", systemImage: "person.2", value: Tab.social) {
                    NavigationStack(path: $socialPath) {
                        SocialView()
                            .navigationDestination(for: AppDestination.self) { destination in
                                destinationView(for: destination)
                            }
                    }
                }

                SwiftUI.Tab("Notes", systemImage: "note.text", value: Tab.notes) {
                    NavigationStack(path: $notesPath) {
                        NotesTabView()
                            .navigationDestination(for: AppDestination.self) { destination in
                                destinationView(for: destination)
                            }
                    }
                }

                SwiftUI.Tab("Profile", systemImage: "person.crop.circle", value: Tab.profile) {
                    NavigationStack(path: $profilePath) {
                        ProfileTabView()
                            .navigationDestination(for: AppDestination.self) { destination in
                                destinationView(for: destination)
                            }
                    }
                }
            }

            if audioPlayer.hasContent {
                MiniPlayerView(isNowPlayingPresented: $isNowPlayingPresented)
                    .padding(.horizontal, 8)
                    .padding(.bottom, 57) // Clear the tab bar + visual gap
                    .opacity(isNowPlayingPresented ? 0.3 : 1)
                    .scaleEffect(isNowPlayingPresented ? 0.94 : 1, anchor: .bottom)
                    .blur(radius: isNowPlayingPresented ? 4 : 0)
                    .animation(.easeInOut(duration: 0.35), value: isNowPlayingPresented)
            }

            // Toast overlay — positioned above the mini player, below the safe area top
            if let toast = currentToast {
                VStack {
                    ToastView(toast: toast) {
                        currentToast = nil
                    }
                    Spacer()
                }
                // Offset from the top: below the status bar, clear of the dynamic island
                .padding(.top, 56)
                // Clear the mini player + tab bar when present
                .padding(.bottom, audioPlayer.hasContent ? 130 : 70)
                .transition(.opacity)
                .zIndex(100)
            }
        }
        .environment(audioPlayer)
        .environment(downloadManager)
        .environment(currentUserProvider)
        .environment(genreProvider)
        .environment(tagProvider)
        .environment(\.showNowPlaying, ShowNowPlayingAction { isNowPlayingPresented = true })
        .environment(\.navigateToDestination, navigateAction)
        .environment(\.showSettings, ShowSettingsAction { isSettingsPresented = true })
        .environment(\.pushDestination, PushDestinationAction { destination in
            activePathBinding.wrappedValue.append(destination)
        })
        .environment(\.showToast, ShowToastAction { toast in
            // Replace any existing toast immediately so the new one is always visible
            currentToast = nil
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                currentToast = toast
            }
        })
        .onChange(of: downloadManager.downloadFailedBookTitle) { _, bookTitle in
            guard let bookTitle else { return }
            currentToast = ToastMessage(
                message: "Download failed for \"\(bookTitle)\". Check your connection and try again.",
                style: .error
            )
            downloadManager.clearDownloadFailure()
        }
        .task {
            await downloadManager.initialize()
            audioPlayer.downloadManager = downloadManager

            // Expose download manager to CarPlay scene delegate
            SharedState.downloadManager = downloadManager

            // Start global shared subscriptions
            currentUserProvider.subscribe()
            genreProvider.subscribe()
            tagProvider.subscribe()

            if networkMonitor.isConnected {
                subscribeToPreferences()
                await OfflineProgressQueue.shared.flush()
                Task { await downloadManager.refreshDownloadedBookMetadata() }
            }

            // If a Universal Link was buffered while the user was signing in
            // (or before MainView appeared), route it now.
            consumePendingDeepLink()
        }
        .onChange(of: deepLinkRouter.pendingDestination) { _, newValue in
            // A link arrived while the app was already running and MainView
            // is onscreen — route immediately.
            guard newValue != nil else { return }
            consumePendingDeepLink()
        }
        .onChange(of: networkMonitor.isConnected) { wasConnected, isConnected in
            // Going offline: stop streaming (non-downloaded) playback after a
            // grace period so brief network blips don't interrupt audio.
            if wasConnected && !isConnected {
                stopStreamingTask?.cancel()
                if let bookId = audioPlayer.currentBook?._id,
                   !downloadManager.isBookDownloaded(bookId) {
                    stopStreamingTask = Task {
                        try? await Task.sleep(for: .seconds(5))
                        guard !Task.isCancelled else { return }
                        // Still offline and still playing a non-downloaded book
                        if !networkMonitor.isConnected,
                           let currentId = audioPlayer.currentBook?._id,
                           !downloadManager.isBookDownloaded(currentId) {
                            audioPlayer.stop()
                        }
                    }
                }
            }

            if !wasConnected && isConnected {
                // Network restored — cancel pending stop and resume normal ops
                stopStreamingTask?.cancel()
                stopStreamingTask = nil

                subscribeToPreferences()
                // Note: offline queue flush & metadata refresh are also triggered
                // by .convexReconnected, but fire here as well for fast recovery
                Task {
                    await OfflineProgressQueue.shared.flush()
                    await downloadManager.refreshDownloadedBookMetadata()
                }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .convexReconnected)) { _ in
            // WebSocket reconnected — flush queued progress and refresh metadata
            Task {
                await OfflineProgressQueue.shared.flush()
                await downloadManager.refreshDownloadedBookMetadata()
            }
        }
        .onChange(of: audioPlayer.streamingEventId) { _, newValue in
            guard newValue != nil,
                  let book = audioPlayer.streamingEventBook,
                  audioPlayer.autoDownloadOnPlay,
                  !downloadManager.isBookDownloaded(book._id),
                  !downloadManager.isBookDownloading(book._id) else { return }

            // Check network preference — skip on cellular if Wi-Fi only
            if audioPlayer.downloadNetwork == "wifi" && networkMonitor.isExpensive { return }

            downloadManager.downloadBook(book: book, audioFiles: audioPlayer.streamingEventAudioFiles)
        }
        .onChange(of: audioPlayer.bookCompletedEventId) { _, newValue in
            guard newValue != nil,
                  let bookId = audioPlayer.bookCompletedBookId else { return }

            let isDownloaded = downloadManager.isBookDownloaded(bookId)
            let deletePref = audioPlayer.deleteDownloadAfterPlay

            // Stop player and dismiss Now Playing
            audioPlayer.stop()

            // Navigate to the completed book's detail view on the active tab
            let activePath = activePathBinding
            let alreadyOnBookDetail = activePath.wrappedValue.last == .book(id: bookId)
            if isNowPlayingPresented {
                if !alreadyOnBookDetail {
                    pendingNavigation = .book(id: bookId)
                }
                isNowPlayingPresented = false
            } else if !alreadyOnBookDetail {
                activePath.wrappedValue.append(.book(id: bookId))
            }

            // Handle download cleanup
            guard isDownloaded else { return }
            switch deletePref {
            case "auto":
                downloadManager.deleteBookDownload(bookId: bookId)
            case "ask":
                deleteDownloadBookId = bookId
                if alreadyOnBookDetail && !isNowPlayingPresented {
                    // Already on book detail with no sheet — show prompt immediately
                    showDeleteDownloadConfirmation = true
                } else if !alreadyOnBookDetail {
                    // Will navigate to book detail — let it handle the prompt
                    downloadManager.pendingDeletePromptBookId = bookId
                }
                // Otherwise: sheet is dismissing, onDismiss will show the prompt
            default:
                break // "off" — do nothing
            }
        }
        .onChange(of: audioPlayer.partCompletedEventId) { _, newValue in
            guard newValue != nil,
                  let audioFileId = audioPlayer.partCompletedAudioFileId,
                  let bookId = audioPlayer.partCompletedBookId,
                  downloadManager.isBookDownloaded(bookId) else { return }

            switch audioPlayer.deleteDownloadAfterPlay {
            case "auto":
                downloadManager.deleteAudioFile(audioFileId: audioFileId, bookId: bookId)
            case "ask":
                completedPartAudioFileId = audioFileId
                completedPartBookId = bookId
                showDeletePartConfirmation = true
            default:
                break // "off" — do nothing
            }
        }
        .confirmationDialog(
            "Delete Completed Part?",
            isPresented: $showDeletePartConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete Part", role: .destructive) {
                if let audioFileId = completedPartAudioFileId,
                   let bookId = completedPartBookId {
                    downloadManager.deleteAudioFile(audioFileId: audioFileId, bookId: bookId)
                }
                completedPartAudioFileId = nil
                completedPartBookId = nil
            }
            Button("No, Thank You") {
                completedPartAudioFileId = nil
                completedPartBookId = nil
            }
        } message: {
            Text("Delete the downloaded file for the part you just finished to free up storage?")
        }
        .confirmationDialog(
            "Delete Download?",
            isPresented: $showDeleteDownloadConfirmation,
            titleVisibility: .visible
        ) {
            Button("Delete Download", role: .destructive) {
                if let bookId = deleteDownloadBookId {
                    downloadManager.deleteBookDownload(bookId: bookId)
                }
                deleteDownloadBookId = nil
            }
            Button("No, Thank You") {
                deleteDownloadBookId = nil
            }
        } message: {
            Text("You've finished this book. Delete the downloaded files to free up storage?")
        }
        .sheet(isPresented: $isNowPlayingPresented, onDismiss: {
            if let pending = pendingNavigation {
                pendingNavigation = nil
                activePathBinding.wrappedValue.append(pending)
            }
            if deleteDownloadBookId != nil {
                showDeleteDownloadConfirmation = true
            }
        }) {
            NowPlayingView()
                .environment(audioPlayer)
                .environment(downloadManager)
                .environment(currentUserProvider)
                .environment(genreProvider)
                .environment(tagProvider)
                .environment(\.navigateToDestination, navigateAction)
                .preferredColorScheme(themeManager.preferredColorScheme)
        }
        .sheet(isPresented: $isSettingsPresented) {
            SettingsView()
                .environment(audioPlayer)
                .environment(downloadManager)
                .preferredColorScheme(themeManager.preferredColorScheme)
        }
    }

    // MARK: - Pending Approval Banner

    private var pendingApprovalBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "clock")
                .font(.caption)
            Text("Your account is pending approval. Some features are limited.")
                .font(.caption)
                .multilineTextAlignment(.leading)
        }
        .foregroundStyle(.secondary)
        .padding(.horizontal, 16)
        .padding(.vertical, 8)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(.yellow.opacity(0.15))
    }

    private var navigateAction: NavigateToDestinationAction {
        NavigateToDestinationAction { destination in
            pendingNavigation = destination
            isNowPlayingPresented = false
        }
    }

    /// Routes a destination staged by `DeepLinkRouter` (e.g. from a Universal
    /// Link) to the appropriate tab's navigation stack. If the Now Playing
    /// sheet is open, defer the push until it dismisses — matches the behavior
    /// of `navigateAction` for in-app navigation.
    private func consumePendingDeepLink() {
        guard let (destination, tab) = deepLinkRouter.consume() else { return }

        if selectedTab != tab {
            selectedTab = tab
        }

        let targetPath: Binding<[AppDestination]>
        switch tab {
        case .home: targetPath = $homePath
        case .library: targetPath = $libraryPath
        case .social: targetPath = $socialPath
        case .notes: targetPath = $notesPath
        case .profile: targetPath = $profilePath
        }

        // Avoid pushing a duplicate if the user is already on that destination.
        if targetPath.wrappedValue.last == destination { return }

        if isNowPlayingPresented {
            pendingNavigation = destination
            isNowPlayingPresented = false
        } else {
            targetPath.wrappedValue.append(destination)
        }
    }

    private func subscribeToPreferences() {
        preferencesCancellable?.cancel()
        preferencesCancellable = nil

        guard case .authenticated = ConvexService.shared.authState,
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
        case .browseLibrary(let initialSort):
            LibraryView(initialSort: initialSort)
        case .browseAuthors:
            AuthorsView()
        case .browseShelves:
            MyShelvesBrowseView()
        case .allReadingHistory(let userId, let initialStatus):
            AllReadingHistoryView(userId: userId, initialStatus: initialStatus)
        case .allUserReviews(let userId):
            AllUserReviewsView(userId: userId)
        case .followers(let userId):
            FollowListView(userId: userId, mode: .followers)
        case .following(let userId):
            FollowListView(userId: userId, mode: .following)
        case .userSearch:
            UserSearchView()
        }
    }
}

#Preview {
    MainView()
}
