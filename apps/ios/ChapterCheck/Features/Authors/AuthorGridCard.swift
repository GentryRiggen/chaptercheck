import SwiftUI

/// Card view for the 2-column authors grid.
///
/// Displays a circular author photo (or placeholder icon), the author's name,
/// and a subtitle showing book and series counts.
struct AuthorGridCard: View {
    let author: AuthorWithCounts

    var body: some View {
        VStack(alignment: .center, spacing: 8) {
            authorImage

            Text(author.name)
                .font(.subheadline)
                .fontWeight(.medium)
                .lineLimit(2)
                .multilineTextAlignment(.center)

            Text(subtitle)
                .font(.caption)
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
    }

    // MARK: - Subviews

    private var authorImage: some View {
        AuthorGridImageView(r2Key: author.imageR2Key, size: 80)
    }

    // MARK: - Helpers

    private var subtitle: String {
        let bookPart = "\(author.bookCountInt) \(author.bookCountInt == 1 ? "book" : "books")"
        if author.seriesCountInt > 0 {
            let seriesPart = "\(author.seriesCountInt) \(author.seriesCountInt == 1 ? "series" : "series")"
            return "\(bookPart) · \(seriesPart)"
        }
        return bookPart
    }
}

// MARK: - Author Image View

/// Async circular image view for author photos, used in the authors grid.
///
/// Loads the image URL from `ImageRepository` on appearance. Shows a placeholder
/// circle with a person icon while loading or when no image is available.
private struct AuthorGridImageView: View {
    let r2Key: String?
    let size: CGFloat

    @State private var imageUrl: URL?

    var body: some View {
        Group {
            if let imageUrl {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    default:
                        placeholder
                    }
                }
            } else {
                placeholder
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .task {
            guard let r2Key else { return }
            imageUrl = await ImageRepository.shared.getImageUrl(r2Key: r2Key)
        }
    }

    private var placeholder: some View {
        Circle()
            .fill(.fill.tertiary)
            .overlay {
                Image(systemName: "person.fill")
                    .font(.system(size: size * 0.4))
                    .foregroundStyle(.secondary)
            }
    }
}
