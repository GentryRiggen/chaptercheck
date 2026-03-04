import Combine
import ClerkKit
import SwiftUI

/// Settings screen with user profile header, privacy toggle, account info, and sign out.
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
    @State private var cancellables = Set<AnyCancellable>()

    private let userRepository = UserRepository()

    var body: some View {
        NavigationStack {
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

                // Settings section
                Section {
                    NavigationLink {
                        PlaybackSettingsView()
                    } label: {
                        Label("Playback", systemImage: "play.circle")
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
                } header: {
                    Text("Settings")
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
            .onAppear { subscribeToUser() }
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
        case .search, .browseLibrary, .browseAuthors:
            EmptyView()
        }
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
