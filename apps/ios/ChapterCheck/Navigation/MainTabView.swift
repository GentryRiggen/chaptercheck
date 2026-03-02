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

/// Dismisses the Now Playing sheet and navigates to a destination in the current tab's NavigationStack.
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

extension EnvironmentValues {
    var showNowPlaying: ShowNowPlayingAction {
        get { self[ShowNowPlayingKey.self] }
        set { self[ShowNowPlayingKey.self] = newValue }
    }

    var navigateToDestination: NavigateToDestinationAction {
        get { self[NavigateToDestinationKey.self] }
        set { self[NavigateToDestinationKey.self] = newValue }
    }
}

/// Primary tab-based navigation after authentication.
///
/// Owns the `AudioPlayerManager` as `@State` and injects it into the
/// environment so all child views can access playback state. A persistent
/// `MiniPlayerView` overlay is shown above the tab bar when audio is loaded.
struct MainTabView: View {
    @State private var selectedTab: Tab = .home
    @State private var audioPlayer = AudioPlayerManager()
    @State private var downloadManager = DownloadManager()
    @State private var isNowPlayingPresented = false
    @State private var pendingNavigation: (destination: AppDestination, tab: Tab)?

    @State private var homePath = NavigationPath()
    @State private var libraryPath = NavigationPath()
    @State private var authorsPath = NavigationPath()
    @State private var settingsPath = NavigationPath()

    var body: some View {
        ZStack(alignment: .bottom) {
            TabView(selection: $selectedTab) {
                homeTab
                libraryTab
                authorsTab
                settingsTab
            }

            // Mini player overlay above the tab bar
            if audioPlayer.hasContent {
                VStack(spacing: 0) {
                    MiniPlayerView(isNowPlayingPresented: $isNowPlayingPresented)
                        .padding(.bottom, 2)
                }
                // Position above the tab bar (approximately 49pt)
                .padding(.bottom, 49)
            }
        }
        .environment(audioPlayer)
        .environment(downloadManager)
        .environment(\.showNowPlaying, ShowNowPlayingAction { isNowPlayingPresented = true })
        .environment(\.navigateToDestination, navigateAction)
        .task {
            await downloadManager.initialize()
            audioPlayer.downloadManager = downloadManager
        }
        .sheet(isPresented: $isNowPlayingPresented, onDismiss: {
            if let pending = pendingNavigation {
                pendingNavigation = nil
                path(for: pending.tab).wrappedValue.append(pending.destination)
            }
        }) {
            NowPlayingView()
                .environment(audioPlayer)
                .environment(\.navigateToDestination, navigateAction)
        }
    }

    private var navigateAction: NavigateToDestinationAction {
        NavigateToDestinationAction { destination in
            pendingNavigation = (destination, selectedTab)
            isNowPlayingPresented = false
        }
    }

    private func path(for tab: Tab) -> Binding<NavigationPath> {
        switch tab {
        case .home: return $homePath
        case .library: return $libraryPath
        case .authors: return $authorsPath
        case .settings: return $settingsPath
        }
    }

    // MARK: - Tabs

    private var homeTab: some View {
        NavigationStack(path: $homePath) {
            HomeView()
                .navigationDestination(for: AppDestination.self) { destination in
                    destinationView(for: destination)
                }
        }
        .tabItem {
            Label("Home", systemImage: "house")
        }
        .tag(Tab.home)
    }

    private var libraryTab: some View {
        NavigationStack(path: $libraryPath) {
            LibraryView()
                .navigationDestination(for: AppDestination.self) { destination in
                    destinationView(for: destination)
                }
        }
        .tabItem {
            Label("Books", systemImage: "books.vertical")
        }
        .tag(Tab.library)
    }

    private var authorsTab: some View {
        NavigationStack(path: $authorsPath) {
            AuthorsView()
                .navigationDestination(for: AppDestination.self) { destination in
                    destinationView(for: destination)
                }
        }
        .tabItem {
            Label("Authors", systemImage: "person.2")
        }
        .tag(Tab.authors)
    }

    private var settingsTab: some View {
        NavigationStack(path: $settingsPath) {
            SettingsView()
                .navigationDestination(for: AppDestination.self) { destination in
                    destinationView(for: destination)
                }
        }
        .tabItem {
            Label("Settings", systemImage: "gearshape")
        }
        .tag(Tab.settings)
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
        }
    }
}

// MARK: - Tab Enum

extension MainTabView {
    enum Tab: Hashable {
        case home
        case library
        case authors
        case settings
    }
}

// MARK: - Settings View

/// Settings screen with user profile header, privacy toggle, account info, and sign out.
private struct SettingsView: View {
    @ObservedObject private var convexService = ConvexService.shared
    @Environment(DownloadManager.self) private var downloadManager
    @State private var convexUser: UserWithPermissions?
    @State private var isProfilePrivate = false
    @State private var hasInitialized = false
    @State private var cancellables = Set<AnyCancellable>()

    private let userRepository = UserRepository()

    var body: some View {
        Form {
            // User header section
            if let user = Clerk.shared.user {
                Section {
                    userHeader(user)
                }
            }

            // Profile section — only available once the Convex user is loaded
            if let convexUser {
                Section {
                    NavigationLink(value: AppDestination.profile(userId: convexUser._id)) {
                        Label("View Profile", systemImage: "person.crop.circle")
                    }

                    Toggle("Private Profile", isOn: $isProfilePrivate)
                        .onChange(of: isProfilePrivate) { _, newValue in
                            guard hasInitialized else { return }
                            updatePrivacy(newValue)
                        }
                } header: {
                    Text("Profile")
                } footer: {
                    Text("When enabled, other users won't see your read books, reviews, or shelves.")
                }
            }

            // Downloads section
            Section {
                NavigationLink {
                    DownloadsView()
                } label: {
                    HStack {
                        Label("Downloads", systemImage: "arrow.down.circle")
                        Spacer()
                        if downloadManager.totalStorageUsed > 0 {
                            Text(ByteCountFormatter.string(
                                fromByteCount: downloadManager.totalStorageUsed,
                                countStyle: .file
                            ))
                            .foregroundStyle(.secondary)
                        }
                    }
                }
            }

            // Account details section
            Section {
                if let user = Clerk.shared.user {
                    LabeledContent(
                        "Email",
                        value: user.emailAddresses.first?.emailAddress ?? "Unknown"
                    )
                    let fullName = [user.firstName, user.lastName]
                        .compactMap { $0 }
                        .joined(separator: " ")
                    if !fullName.isEmpty {
                        LabeledContent("Name", value: fullName)
                    }
                }
            } header: {
                Text("Account")
            }

            // Sign out
            Section {
                Button("Sign Out", role: .destructive) {
                    downloadManager.deleteAllDownloads()
                    Task {
                        await convexService.logout()
                    }
                }
            }
        }
        .navigationTitle("Settings")
        .onAppear { subscribeToUser() }
        .onDisappear { cancellables.removeAll() }
    }

    // MARK: - User Header

    @ViewBuilder
    private func userHeader(_ user: User) -> some View {
        VStack(spacing: 8) {
            if let url = URL(string: user.imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        avatarPlaceholder
                    }
                }
                .frame(width: 60, height: 60)
                .clipShape(Circle())
            } else {
                avatarPlaceholder
            }

            let fullName = [user.firstName, user.lastName]
                .compactMap { $0 }
                .joined(separator: " ")
            if !fullName.isEmpty {
                Text(fullName)
                    .font(.headline)
            }

            if let email = user.emailAddresses.first?.emailAddress {
                Text(email)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(.secondary.opacity(0.2))
            .overlay {
                Image(systemName: "person.fill")
                    .font(.title2)
                    .foregroundStyle(.secondary)
            }
            .frame(width: 60, height: 60)
    }

    // MARK: - Subscriptions

    private func subscribeToUser() {
        guard cancellables.isEmpty,
              let publisher = userRepository.subscribeToCurrentUser() else { return }

        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { user in
                    convexUser = user
                    if !hasInitialized, let user {
                        isProfilePrivate = user.isProfilePrivate
                        hasInitialized = true
                    }
                }
            )
            .store(in: &cancellables)
    }

    // MARK: - Actions

    private func updatePrivacy(_ isPrivate: Bool) {
        Task {
            try? await userRepository.updateProfilePrivacy(isPrivate: isPrivate)
        }
    }
}

#Preview {
    MainTabView()
}
