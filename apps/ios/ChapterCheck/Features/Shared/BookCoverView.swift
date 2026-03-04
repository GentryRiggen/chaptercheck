import SwiftUI

/// Async image view that loads book/author cover images from presigned R2 URLs.
///
/// Supports two display modes:
/// - `.square(size)` — fixed square frame with center-cropped fill (for compact rows).
/// - `.fit(maxWidth:maxHeight:)` — natural aspect ratio within a bounding box (for prominent displays).
///
/// Uses `ImageRepository.shared` to resolve R2 keys to presigned URLs
/// with automatic caching.
struct BookCoverView: View {
    enum DisplayMode {
        /// Fixed square frame, center-cropped fill. Good for compact list rows.
        case square(CGFloat)
        /// Natural aspect ratio within a bounding box. Good for hero/detail displays.
        case fit(maxWidth: CGFloat, maxHeight: CGFloat)
    }

    let r2Key: String?
    var displayMode: DisplayMode = .square(120)

    @State private var imageUrl: URL?
    @State private var isLoading = false

    init(r2Key: String?, displayMode: DisplayMode = .square(120)) {
        self.r2Key = r2Key
        self.displayMode = displayMode
    }

    /// Backward-compatible convenience init for square mode.
    init(r2Key: String?, size: CGFloat) {
        self.r2Key = r2Key
        self.displayMode = .square(size)
    }

    var body: some View {
        coverContent
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .task(id: r2Key) {
                await loadImageUrl()
            }
    }

    // MARK: - Cover Content

    @ViewBuilder
    private var coverContent: some View {
        switch displayMode {
        case .square(let size):
            squareContent(size: size)
        case .fit(let maxWidth, let maxHeight):
            fitContent(maxWidth: maxWidth, maxHeight: maxHeight)
        }
    }

    // MARK: - Square Mode

    @ViewBuilder
    private func squareContent(size: CGFloat) -> some View {
        Group {
            if let imageUrl {
                AsyncImage(url: imageUrl) { phase in
                    switch phase {
                    case .success(let image):
                        image.resizable().scaledToFill()
                    case .failure:
                        placeholder(iconSize: size * 0.25)
                    case .empty:
                        SkeletonView(shape: .rectangle, width: size, height: size)
                    @unknown default:
                        placeholder(iconSize: size * 0.25)
                    }
                }
            } else if isLoading {
                SkeletonView(shape: .rectangle, width: size, height: size)
            } else {
                placeholder(iconSize: size * 0.25)
            }
        }
        .frame(width: size, height: size)
    }

    // MARK: - Fit Mode

    @ViewBuilder
    private func fitContent(maxWidth: CGFloat, maxHeight: CGFloat) -> some View {
        let phSize = fitPlaceholderSize(maxWidth: maxWidth, maxHeight: maxHeight)

        if let imageUrl {
            AsyncImage(url: imageUrl) { phase in
                switch phase {
                case .success(let image):
                    image.resizable().scaledToFit()
                case .failure:
                    placeholder(iconSize: min(phSize.width, phSize.height) * 0.25)
                        .frame(width: phSize.width, height: phSize.height)
                case .empty:
                    SkeletonView(shape: .rectangle, width: phSize.width, height: phSize.height)
                @unknown default:
                    placeholder(iconSize: min(phSize.width, phSize.height) * 0.25)
                        .frame(width: phSize.width, height: phSize.height)
                }
            }
            .frame(maxWidth: maxWidth, maxHeight: maxHeight)
        } else if isLoading {
            SkeletonView(shape: .rectangle, width: phSize.width, height: phSize.height)
        } else {
            placeholder(iconSize: min(phSize.width, phSize.height) * 0.25)
                .frame(width: phSize.width, height: phSize.height)
        }
    }

    /// Computes a 2:3 (book-like) placeholder size that fits within the bounding box.
    private func fitPlaceholderSize(maxWidth: CGFloat, maxHeight: CGFloat) -> CGSize {
        let w = min(maxWidth, maxHeight / 1.5)
        return CGSize(width: w, height: w * 1.5)
    }

    // MARK: - Placeholder

    private func placeholder(iconSize: CGFloat) -> some View {
        ZStack {
            RoundedRectangle(cornerRadius: 8)
                .fill(.fill.tertiary)
            Image(systemName: "book.closed.fill")
                .font(.system(size: iconSize))
                .foregroundStyle(.secondary)
        }
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
    VStack(spacing: 16) {
        HStack(spacing: 16) {
            BookCoverView(r2Key: nil, size: 80)
            BookCoverView(r2Key: nil, displayMode: .fit(maxWidth: 80, maxHeight: 120))
        }
    }
    .padding()
}
