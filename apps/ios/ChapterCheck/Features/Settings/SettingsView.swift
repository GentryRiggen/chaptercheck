import Combine
import ConvexMobile
import PulseUI
import SwiftUI

/// Settings screen with privacy toggle, account info, storage, and sign out.
///
/// Presented as a sheet from `MainView`. Wraps content in its own `NavigationStack`
/// since it's no longer inside a tab with a dedicated navigation stack.
struct SettingsView: View {
    @ObservedObject private var convexService = ConvexService.shared
    @Environment(DownloadManager.self) private var downloadManager
    @Environment(\.dismiss) private var dismiss
    @State private var convexUser: UserWithPermissions?
    @State private var storageStats: StorageStats?
    @State private var cancellables = Set<AnyCancellable>()
    @State private var showLogs = false
    @State private var showSignOutConfirmation = false

    private let userRepository = UserRepository()

    private var appVersionString: String {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "?"
        let build = Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "?"
        return "\(version) (\(build))"
    }

    var body: some View {
        NavigationStack {
            Form {
                // Settings section
                Section {
                    NavigationLink {
                        PlaybackSettingsView()
                    } label: {
                        Label("Playback", systemImage: "play.circle")
                    }

                    NavigationLink {
                        ThemeSettingsView()
                    } label: {
                        Label("Theme", systemImage: "paintbrush")
                    }

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

                    NavigationLink {
                        DownloadSettingsView()
                    } label: {
                        Label("Download Preferences", systemImage: "arrow.down.to.line.circle")
                    }

                    NavigationLink {
                        BlockedUsersView()
                    } label: {
                        Label("Blocked Users", systemImage: "person.crop.circle.badge.minus")
                    }
                } header: {
                    Text("Settings")
                }

                // Storage section
                if let stats = storageStats {
                    storageSection(stats)
                }

                // About section
                Section {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text(appVersionString)
                            .foregroundStyle(.secondary)
                    }

                    Button {
                        showLogs = true
                    } label: {
                        Label("Logs", systemImage: "doc.text.magnifyingglass")
                    }
                } header: {
                    Text("About")
                }

                // Sign out & account
                Section {
                    Button {
                        showSignOutConfirmation = true
                    } label: {
                        Label("Sign Out", systemImage: "rectangle.portrait.and.arrow.right")
                    }

                    NavigationLink {
                        DeleteAccountView()
                    } label: {
                        Label("Delete Account", systemImage: "trash")
                            .foregroundStyle(.red)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationDestination(for: AppDestination.self) { destination in
                settingsDestinationView(for: destination)
            }
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .onAppear {
                subscribeToUser()
                subscribeToStorageStats()
            }
            .onDisappear { cancellables.removeAll() }
            .sheet(isPresented: $showLogs) {
                NavigationStack {
                    ConsoleView()
                }
            }
            .sheet(isPresented: $showSignOutConfirmation) {
                SignOutConfirmationView(onSignOut: performSignOut)
                    .presentationDetents([.medium])
                    .presentationDragIndicator(.visible)
            }
        }
    }

    // MARK: - Navigation Destination

    @ViewBuilder
    private func settingsDestinationView(for destination: AppDestination) -> some View {
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
        case .allReadingHistory(let userId, let initialStatus):
            AllReadingHistoryView(userId: userId, initialStatus: initialStatus)
        case .allUserReviews(let userId):
            AllUserReviewsView(userId: userId)
        case .browseShelves:
            MyShelvesBrowseView()
        case .followers(let userId):
            FollowListView(userId: userId, mode: .followers)
        case .following(let userId):
            FollowListView(userId: userId, mode: .following)
        case .userSearch:
            UserSearchView()
        case .browseLibrary, .browseAuthors:
            EmptyView()
        case .messages:
            MessagesTabView()
        case .conversation(let otherUserId):
            ConversationView(otherUserId: otherUserId)
        case .composeMessage:
            ComposeMessageView()
        }
    }

    // MARK: - Storage Section

    @ViewBuilder
    private func storageSection(_ stats: StorageStats) -> some View {
        let usedBytes = Int64(stats.totalBytesUsed)
        let limitBytes: Double = 2 * 1_024 * 1_024 * 1_024 * 1_024 // 2 TB
        let fraction = stats.totalBytesUsed / limitBytes
        let fileCount = Int(stats.fileCount)

        Section {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text(ByteCountFormatter.string(fromByteCount: usedBytes, countStyle: .file))
                        .font(.subheadline.bold())
                    Spacer()
                    Text("of 2 TB")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                ProgressView(value: fraction)
                    .tint(fraction > 0.9 ? .red : nil)
                Text("\(fileCount) file\(fileCount == 1 ? "" : "s")")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            .padding(.vertical, 4)
        } header: {
            Text("Storage")
        } footer: {
            Text("Storage used by your uploaded audiobook files.")
        }
    }

    // MARK: - Sign Out

    private func performSignOut() {
        downloadManager.deleteAllDownloads()
        UserDefaults.standard.removeObject(forKey: "hasAuthenticatedBefore")
        Task {
            await convexService.logout()
        }
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
                }
            )
            .store(in: &cancellables)
    }

    private func subscribeToStorageStats() {
        // Guard: subscribeToUser() adds to cancellables first;
        // if storage is already subscribed the set will have > 1 entry.
        guard cancellables.count <= 1 else { return }

        let publisher: AnyPublisher<StorageStats, ClientError> = ConvexService.shared.subscribe(
            to: "storageAccounts/queries:getStorageStats"
        )
        publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in },
                receiveValue: { stats in storageStats = stats }
            )
            .store(in: &cancellables)
    }
}
