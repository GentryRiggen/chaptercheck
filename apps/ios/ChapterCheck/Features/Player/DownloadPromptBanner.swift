import SwiftUI

/// Brief banner encouraging users to download the currently streaming book for offline use.
///
/// Appears above the mini player with a glass capsule style matching `MiniPlayerView`.
/// Auto-dismissed by the parent after 5 seconds; also supports manual dismiss via X button
/// or swipe-down gesture.
struct DownloadPromptBanner: View {
    let bookTitle: String
    let onDownload: () -> Void
    let onDismiss: () -> Void

    @State private var dragOffset: CGFloat = 0

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "arrow.down.circle")
                .font(.system(size: 20))
                .foregroundStyle(.tint)

            VStack(alignment: .leading, spacing: 1) {
                Text("Download for offline?")
                    .font(.subheadline.weight(.medium))

                Text(bookTitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)

            Button {
                Haptics.light()
                onDownload()
            } label: {
                Text("Download")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(.white)
                    .padding(.horizontal, 12)
                    .padding(.vertical, 6)
                    .background(.tint, in: Capsule())
            }
            .buttonStyle(.plain)

            Button {
                onDismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .frame(width: 28, height: 28)
            }
            .buttonStyle(.plain)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .glassEffect(.regular.interactive(), in: .capsule)
        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 2)
        .offset(y: dragOffset)
        .gesture(
            DragGesture()
                .onChanged { value in
                    if value.translation.height > 0 {
                        dragOffset = value.translation.height
                    }
                }
                .onEnded { value in
                    if value.translation.height > 40 {
                        onDismiss()
                    } else {
                        withAnimation(.spring(duration: 0.3)) {
                            dragOffset = 0
                        }
                    }
                }
        )
    }
}

/// Brief notification banner shown when auto-download starts for a book.
///
/// Non-interactive, auto-dismissed by the parent after 3 seconds.
struct AutoDownloadNoticeBanner: View {
    let bookTitle: String

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "arrow.down.circle.fill")
                .font(.system(size: 20))
                .foregroundStyle(.tint)

            VStack(alignment: .leading, spacing: 1) {
                Text("Downloading for offline")
                    .font(.subheadline.weight(.medium))

                Text(bookTitle)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
            }

            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 10)
        .glassEffect(.regular.interactive(), in: .capsule)
        .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 2)
    }
}
