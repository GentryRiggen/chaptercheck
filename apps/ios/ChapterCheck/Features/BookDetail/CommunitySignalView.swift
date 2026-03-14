import SwiftUI

struct CommunitySignalView: View {
    let ratingStats: RatingStats?
    let bookGenres: [BookGenre]

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Community")
                .font(.headline)

            if let stats = ratingStats, let avg = stats.averageRating {
                HStack(spacing: 10) {
                    RatingView(rating: avg, size: 20)
                    Text(String(format: "%.1f", avg))
                        .font(.title3.weight(.semibold))
                        .monospacedDigit()
                    Text("(\(stats.ratingCountInt) \(stats.ratingCountInt == 1 ? "rating" : "ratings"))")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            } else {
                Text("No ratings yet")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            if !bookGenres.isEmpty {
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(bookGenres) { genre in
                            HStack(spacing: 4) {
                                Text(genre.name)
                                    .font(.caption.weight(.medium))
                                Text("\(genre.voteCountInt)")
                                    .font(.caption2.weight(.semibold))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 10)
                            .padding(.vertical, 6)
                            .background(Color(.secondarySystemFill), in: Capsule())
                        }
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
    }
}
