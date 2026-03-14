import SwiftUI

struct ActivityItemRow: View {
    let item: ActivityItem

    var body: some View {
        NavigationLink(value: AppDestination.book(id: item.book._id)) {
            HStack(alignment: .top, spacing: 12) {
                BookCoverView(r2Key: item.book.coverImageR2Key, size: 56)

                VStack(alignment: .leading, spacing: 4) {
                    // User + action
                    HStack(spacing: 6) {
                        userAvatar

                        (Text(item.user.name ?? "Someone").fontWeight(.semibold)
                            + Text(" \(actionText)"))
                            .font(.caption)
                            .lineLimit(1)
                    }

                    // Book title
                    Text(item.book.title)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)
                        .lineLimit(2)

                    // Content preview
                    contentPreview

                    // Timestamp
                    Text(TimeFormatting.formatRelativeDate(item.timestamp))
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
            }
            .padding(.vertical, 10)
        }
        .buttonStyle(.plain)
    }

    private var userAvatar: some View {
        Group {
            if let imageUrl = item.user.imageUrl, let url = URL(string: imageUrl) {
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
            } else {
                avatarPlaceholder
            }
        }
        .frame(width: 20, height: 20)
        .clipShape(Circle())
    }

    private var avatarPlaceholder: some View {
        Circle()
            .fill(Color(.tertiarySystemFill))
            .overlay {
                Text(initials)
                    .font(.system(size: 9, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
    }

    private var initials: String {
        guard let name = item.user.name, let first = name.first else { return "?" }
        return String(first).uppercased()
    }

    private var actionText: String {
        switch item.type {
        case .review:
            return "reviewed"
        case .shelfAdd:
            if let shelfName = item.shelfName {
                return "added to \(shelfName)"
            }
            return "added to a shelf"
        case .publicNote:
            return "shared a note on"
        }
    }

    @ViewBuilder
    private var contentPreview: some View {
        switch item.type {
        case .review:
            if let rating = item.rating {
                RatingView(rating: rating, size: 10)
            }
            if let text = item.reviewText, !text.isEmpty {
                Text(text)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        case .publicNote:
            if let text = item.noteText, !text.isEmpty {
                Text(text)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(2)
            }
        case .shelfAdd:
            EmptyView()
        }
    }
}
