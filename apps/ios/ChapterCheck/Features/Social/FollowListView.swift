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
                        UserAvatarRow(user: user)
                    }
                }
                .safeAreaInset(edge: .bottom) {
                    Spacer().frame(height: 80)
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
