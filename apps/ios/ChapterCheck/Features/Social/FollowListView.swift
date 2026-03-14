import Combine
import ConvexMobile
import SwiftUI

enum FollowListMode {
    case followers
    case following
}

struct FollowListView: View {
    let userId: String
    let mode: FollowListMode

    @State private var users: [FollowedUser] = []
    @State private var cancellable: AnyCancellable?
    @State private var isLoading = true
    @State private var authObserver = ConvexAuthObserver()
    private let socialRepository = SocialRepository()

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if users.isEmpty {
                ContentUnavailableView(
                    mode == .followers ? "No Followers" : "Not Following Anyone",
                    systemImage: "person.2",
                    description: Text(
                        mode == .followers
                            ? "No one is following this user yet."
                            : "This user isn't following anyone yet."
                    )
                )
            } else {
                List {
                    ForEach(users) { user in
                        NavigationLink(value: AppDestination.profile(userId: user._id)) {
                            HStack(spacing: 12) {
                                userAvatar(user)
                                Text(user.name ?? "Anonymous")
                                    .font(.body)
                                Spacer()
                                FollowButton(userId: user._id)
                            }
                        }
                    }

                    Color.clear
                        .frame(height: 80)
                        .listRowBackground(Color.clear)
                        .listRowSeparator(.hidden)
                }
            }
        }
        .navigationTitle(mode == .followers ? "Followers" : "Following")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { startSubscription() }
        .onDisappear {
            authObserver.cancel()
            cancellable?.cancel()
        }
    }

    private func userAvatar(_ user: FollowedUser) -> some View {
        Group {
            if let imageUrl = user.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().aspectRatio(contentMode: .fill)
                    default:
                        avatarPlaceholder(for: user)
                    }
                }
            } else {
                avatarPlaceholder(for: user)
            }
        }
        .frame(width: 36, height: 36)
        .clipShape(Circle())
    }

    private func avatarPlaceholder(for user: FollowedUser) -> some View {
        Circle()
            .fill(Color(.tertiarySystemFill))
            .overlay {
                Text(String((user.name ?? "?").prefix(1)).uppercased())
                    .font(.caption.weight(.semibold))
                    .foregroundStyle(.secondary)
            }
    }

    private func startSubscription() {
        authObserver.start(
            onAuthenticated: { [self] in
                guard cancellable == nil else { return }
                subscribe()
            },
            onUnauthenticated: { [self] in
                cancellable?.cancel()
                cancellable = nil
            }
        )
    }

    private func subscribe() {
        let publisher: AnyPublisher<[FollowedUser], ClientError>?
        switch mode {
        case .followers:
            publisher = socialRepository.subscribeToUserFollowers(userId: userId)
        case .following:
            publisher = socialRepository.subscribeToUserFollowing(userId: userId)
        }

        guard let publisher else {
            isLoading = false
            return
        }

        cancellable = publisher
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { _ in isLoading = false },
                receiveValue: { result in
                    users = result
                    isLoading = false
                }
            )
    }
}
