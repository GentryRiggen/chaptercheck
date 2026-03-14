import SwiftUI

struct ActivityItemRow: View {
    let item: ActivityItem

    private let coverSize: CGFloat = 56

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            // Book cover — taps to book detail
            NavigationLink(value: AppDestination.book(id: item.book._id)) {
                BookCoverView(r2Key: item.book.coverImageR2Key, size: coverSize)
            }
            .buttonStyle(.plain)

            VStack(alignment: .leading, spacing: 4) {
                // User + action — taps to profile
                NavigationLink(value: AppDestination.profile(userId: item.user._id)) {
                    HStack(spacing: 6) {
                        avatarImage
                        (Text(item.user.name ?? "Someone").fontWeight(.semibold)
                            + Text(" \(actionText)"))
                            .font(.caption)
                            .lineLimit(1)
                    }
                }
                .buttonStyle(.plain)

                // Book title — taps to book
                NavigationLink(value: AppDestination.book(id: item.book._id)) {
                    Text(item.book.title)
                        .font(.subheadline.weight(.medium))
                        .foregroundStyle(.primary)
                        .lineLimit(2)
                }
                .buttonStyle(.plain)

                contentPreview

                Text(TimeFormatting.formatRelativeDate(item.timestamp))
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.vertical, 10)
    }

    // MARK: - Avatar

    private var avatarImage: some View {
        ZStack {
            Circle()
                .fill(Color(.tertiarySystemFill))
                .overlay {
                    Text(initials)
                        .font(.system(size: 9, weight: .semibold))
                        .foregroundStyle(.secondary)
                }

            // On failure/loading, the placeholder circle beneath remains visible
            if let imageUrl = item.user.imageUrl, let url = URL(string: imageUrl) {
                AsyncImage(url: url) { phase in
                    if case .success(let image) = phase {
                        image.resizable().scaledToFill()
                    }
                }
            }
        }
        .frame(width: 20, height: 20)
        .clipShape(Circle())
    }

    // MARK: - Helpers

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
            if let shelfId = item.shelfId {
                NavigationLink(value: AppDestination.shelf(id: shelfId)) {
                    Label(item.shelfName ?? "Shelf", systemImage: "books.vertical")
                        .font(.caption)
                        .foregroundStyle(.tint)
                }
                .buttonStyle(.plain)
            }
        }
    }
}
