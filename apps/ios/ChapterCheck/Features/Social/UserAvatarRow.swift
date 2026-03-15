import SwiftUI

/// Reusable row displaying a user avatar, name, and follow button.
/// Used in Find People, Follow Lists, and other social contexts.
struct UserAvatarRow: View {
    let user: FollowedUser

    var body: some View {
        NavigationLink(value: AppDestination.profile(userId: user._id)) {
            HStack(spacing: 12) {
                userAvatar
                Text(user.name ?? "Anonymous")
                    .font(.body)
                Spacer()
                FollowButton(userId: user._id)
            }
        }
    }

    private var userAvatar: some View {
        ZStack {
            Circle()
                .fill(Color(.tertiarySystemFill))
                .overlay {
                    Text(String((user.name ?? "?").prefix(1)).uppercased())
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(.secondary)
                }

            if let imageUrl = user.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    if case .success(let image) = phase {
                        image.resizable().aspectRatio(contentMode: .fill)
                    }
                }
            }
        }
        .frame(width: 40, height: 40)
        .clipShape(Circle())
    }
}
