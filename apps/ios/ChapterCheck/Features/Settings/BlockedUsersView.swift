import Combine
import ConvexMobile
import SwiftUI

/// Displays the list of users the current user has blocked, with the ability
/// to unblock any of them via swipe or a confirmation alert.
struct BlockedUsersView: View {

    @State private var blockedUsers: [BlockedUser] = []
    @State private var isLoading = true
    @State private var cancellable: AnyCancellable?
    @State private var authObserver = ConvexAuthObserver()
    @State private var unblockTarget: BlockedUser?
    @State private var showUnblockConfirmation = false
    @State private var isUnblocking = false
    @Environment(\.showToast) private var showToast

    private let blockRepository = BlockRepository()

    var body: some View {
        Group {
            if isLoading {
                ProgressView()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if blockedUsers.isEmpty {
                emptyState
            } else {
                blockedList
            }
        }
        .navigationTitle("Blocked Users")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear { startSubscription() }
        .onDisappear {
            authObserver.cancel()
            cancellable?.cancel()
        }
        .alert(
            "Unblock \(unblockTarget?.displayName ?? "this user")?",
            isPresented: $showUnblockConfirmation
        ) {
            Button("Unblock", role: .destructive) {
                guard let target = unblockTarget else { return }
                Task { await performUnblock(target) }
            }
            Button("Cancel", role: .cancel) {
                unblockTarget = nil
            }
        } message: {
            Text("They will be able to see your activity and you will see theirs again.")
        }
    }

    // MARK: - Content

    private var blockedList: some View {
        List {
            ForEach(blockedUsers) { user in
                blockedUserRow(user)
                    .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                        Button(role: .destructive) {
                            unblockTarget = user
                            showUnblockConfirmation = true
                        } label: {
                            Label("Unblock", systemImage: "person.crop.circle.badge.checkmark")
                        }
                    }
            }
        }
    }

    private func blockedUserRow(_ user: BlockedUser) -> some View {
        HStack(spacing: 12) {
            userAvatar(user)

            VStack(alignment: .leading, spacing: 2) {
                Text(user.displayName)
                    .font(.subheadline)
                    .fontWeight(.medium)
            }

            Spacer()

            Button {
                unblockTarget = user
                showUnblockConfirmation = true
            } label: {
                Text("Unblock")
                    .font(.subheadline)
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)
                    .background(Capsule().strokeBorder(Color.accentColor, lineWidth: 1))
                    .foregroundStyle(Color.accentColor)
            }
            .buttonStyle(.plain)
            .disabled(isUnblocking)
        }
        .padding(.vertical, 4)
    }

    private func userAvatar(_ user: BlockedUser) -> some View {
        ZStack {
            Circle()
                .fill(Color(.tertiarySystemFill))
                .overlay {
                    Text(initials(for: user.name))
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.secondary)
                }

            if let imageUrl = user.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    if case .success(let image) = phase {
                        image.resizable().scaledToFill()
                    }
                }
            }
        }
        .frame(width: 40, height: 40)
        .clipShape(Circle())
    }

    private var emptyState: some View {
        ContentUnavailableView(
            "No Blocked Users",
            systemImage: "person.crop.circle.badge.checkmark",
            description: Text("Users you block will appear here.")
        )
    }

    // MARK: - Actions

    private func performUnblock(_ user: BlockedUser) async {
        isUnblocking = true
        do {
            try await blockRepository.unblockUser(blockedUserId: user._id)
            unblockTarget = nil
            showToast.success("\(user.displayName) has been unblocked.")
        } catch {
            showToast.error("Failed to unblock \(user.displayName). Please try again.")
        }
        isUnblocking = false
    }

    // MARK: - Subscription

    private func startSubscription() {
        authObserver.start(
            onAuthenticated: { [self] in
                guard cancellable == nil else { return }
                guard let publisher = blockRepository.subscribeToBlockedUsers() else {
                    isLoading = false
                    return
                }
                cancellable = publisher
                    .receive(on: DispatchQueue.main)
                    .sink(
                        receiveCompletion: { _ in
                            isLoading = false
                        },
                        receiveValue: { users in
                            blockedUsers = users
                            isLoading = false
                        }
                    )
            },
            onUnauthenticated: { [self] in
                cancellable?.cancel()
                cancellable = nil
                isLoading = false
            }
        )
    }

    // MARK: - Helpers

    private func initials(for name: String?) -> String {
        guard let name, let first = name.first else { return "?" }
        return String(first).uppercased()
    }
}
