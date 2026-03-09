import Combine
import ConvexMobile
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
    @State private var isProfilePrivate = false
    @State private var hasInitialized = false
    @State private var storageStats: StorageStats?
    @State private var cancellables = Set<AnyCancellable>()

    private let userRepository = UserRepository()

    var body: some View {
        NavigationStack {
            Form {
                // Profile section — only available once the Convex user is loaded
                if let convexUser {
                    Section {
                        NavigationLink(value: AppDestination.profile(userId: convexUser._id)) {
                            Label("View Profile", systemImage: "person.crop.circle")
                        }

                        NavigationLink {
                            EditProfileView()
                        } label: {
                            Label("Edit Profile", systemImage: "pencil")
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
                } header: {
                    Text("Settings")
                }

                // Storage section
                if let stats = storageStats {
                    storageSection(stats)
                }

                // Sign out
                Section {
                    Button {
                        Task {
                            await convexService.resetApplicationSession(reason: "manual_settings_reset")
                        }
                    } label: {
                        HStack {
                            Label("Reload App Session", systemImage: "arrow.clockwise.circle")
                            Spacer()
                            if convexService.isResetting {
                                ProgressView()
                                    .controlSize(.small)
                            }
                        }
                    }
                    .disabled(convexService.isResetting)

                    Button("Sign Out", role: .destructive) {
                        downloadManager.deleteAllDownloads()
                        UserDefaults.standard.removeObject(forKey: "hasAuthenticatedBefore")
                        Task {
                            await convexService.logout()
                        }
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
        case .allReadingHistory(let userId):
            AllReadingHistoryView(userId: userId)
        case .allUserReviews(let userId):
            AllUserReviewsView(userId: userId)
        case .browseShelves:
            MyShelvesBrowseView()
        case .search, .browseLibrary, .browseAuthors:
            EmptyView()
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

    // MARK: - Actions

    private func updatePrivacy(_ isPrivate: Bool) {
        Task {
            try? await userRepository.updateProfilePrivacy(isPrivate: isPrivate)
        }
    }
}
