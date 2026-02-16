import SwiftUI

/// Async image view that loads book/author cover images from presigned R2 URLs.
///
/// Handles three states:
/// 1. No `r2Key` provided -- shows a static placeholder.
/// 2. Loading -- shows a shimmer placeholder.
/// 3. Loaded or failed -- shows the image or falls back to placeholder.
///
/// Uses `ImageRepository.shared` to resolve R2 keys to presigned URLs
/// with automatic caching.
struct BookCoverView: View {
    let r2Key: String?
    var size: CGFloat = 120

    @State private var imageUrl: URL?
    @State private var isLoading = false

    var body: some View {
        Group {
            if let imageUrl {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                    case .failure:
                        placeholderView
                    case .empty:
                        shimmerPlaceholder
                    @unknown default:
                        placeholderView
                    }
                }
            } else if isLoading {
                shimmerPlaceholder
            } else {
                placeholderView
            }
        }
        .frame(width: size, height: size * 1.5)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .task(id: r2Key) {
            await loadImageUrl()
        }
    }

    // MARK: - Placeholder

    private var placeholderView: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
            Image(systemName: "book.closed.fill")
                .font(.system(size: size * 0.25))
                .foregroundStyle(.secondary)
        }
    }

    private var shimmerPlaceholder: some View {
        SkeletonView(shape: .rectangle, width: size, height: size * 1.5)
    }

    // MARK: - Loading

    private func loadImageUrl() async {
        guard let r2Key, !r2Key.isEmpty else {
            imageUrl = nil
            return
        }

        isLoading = true
        imageUrl = await ImageRepository.shared.getImageUrl(r2Key: r2Key)
        isLoading = false
    }
}

#Preview {
    HStack(spacing: 16) {
        BookCoverView(r2Key: nil, size: 80)
        BookCoverView(r2Key: "https://covers.openlibrary.org/b/id/8451396-L.jpg", size: 80)
    }
    .padding()
}
