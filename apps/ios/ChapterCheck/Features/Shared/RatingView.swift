import SwiftUI

/// Displays a rating as filled/empty star icons.
///
/// Supports the ChapterCheck 1-3 rating scale. Stars are displayed
/// at a configurable size and color.
struct RatingView: View {
    let rating: Double?
    var maxRating: Int = 3
    var size: CGFloat = 14
    var color: Color = .orange

    var body: some View {
        if let rating {
            HStack(spacing: 2) {
                ForEach(1...maxRating, id: \.self) { index in
                    Image(systemName: starName(for: index, rating: rating))
                        .font(.system(size: size))
                        .foregroundStyle(color)
                }
            }
        }
    }

    private func starName(for index: Int, rating: Double) -> String {
        let threshold = Double(index)
        if rating >= threshold {
            return "star.fill"
        } else if rating >= threshold - 0.5 {
            return "star.leadinghalf.filled"
        } else {
            return "star"
        }
    }
}

#Preview {
    VStack(spacing: 8) {
        RatingView(rating: 3.0)
        RatingView(rating: 2.5)
        RatingView(rating: 1.0)
        RatingView(rating: nil)
    }
}
