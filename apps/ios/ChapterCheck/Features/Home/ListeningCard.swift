import SwiftUI

/// Compact card (160pt wide) for the horizontal continue listening scroll.
///
/// Shows book cover, title (2 lines max), and a progress bar.
/// Tapping resumes playback via `AudioPlayerManager`.
struct ListeningCard: View {
    let item: RecentListeningProgress
    @Environment(AudioPlayerManager.self) private var audioPlayer

    var body: some View {
        Button {
            Haptics.medium()
        } label: {
            VStack(alignment: .leading, spacing: 8) {
                BookCoverView(r2Key: item.book.coverImageR2Key, size: 100)

                Text(item.book.title)
                    .font(.caption)
                    .fontWeight(.medium)
                    .lineLimit(2)
                    .multilineTextAlignment(.leading)
                    .frame(height: 32, alignment: .top)

                VStack(spacing: 2) {
                    ProgressView(value: item.progressFraction)
                        .tint(.accentColor)

                    Text(item.formattedProgress)
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .trailing)
                }
            }
            .frame(width: 160)
        }
        .buttonStyle(.plain)
    }
}
