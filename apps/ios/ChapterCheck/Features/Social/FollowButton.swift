import Combine
import ConvexMobile
import SwiftUI

struct FollowButton: View {
    let userId: String

    @State private var isFollowing = false
    @State private var isLoading = true
    @State private var cancellable: AnyCancellable?
    @State private var authObserver = ConvexAuthObserver()
    private let socialRepository = SocialRepository()

    var body: some View {
        Button {
            Task { await toggleFollow() }
        } label: {
            Text(isFollowing ? "Following" : "Follow")
                .font(.subheadline.weight(.semibold))
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(
                    Capsule()
                        .fill(isFollowing ? Color(.tertiarySystemFill) : Color.accentColor)
                )
                .foregroundStyle(isFollowing ? AnyShapeStyle(.primary) : AnyShapeStyle(Color.white))
        }
        .buttonStyle(.plain)
        .opacity(isLoading ? 0.5 : 1)
        .disabled(isLoading)
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
                guard let publisher = socialRepository.subscribeToFollowStatus(userId: userId) else { return }
                cancellable = publisher
                    .receive(on: DispatchQueue.main)
                    .sink(
                        receiveCompletion: { _ in },
                        receiveValue: { status in
                            isFollowing = status.isFollowing
                            isLoading = false
                        }
                    )
            },
            onUnauthenticated: { [self] in
                cancellable?.cancel()
                cancellable = nil
            }
        )
    }

    private func toggleFollow() async {
        let wasFollowing = isFollowing
        isFollowing.toggle() // Optimistic update

        do {
            if wasFollowing {
                try await socialRepository.unfollowUser(userId: userId)
            } else {
                try await socialRepository.followUser(userId: userId)
            }
        } catch {
            isFollowing = wasFollowing // Revert on error
        }
    }
}
