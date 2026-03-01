import SwiftUI

/// Interactive 1–3 star rating input.
///
/// Tapping a star sets the rating to that value.
/// Tapping the currently-selected star clears the rating (sets to `nil`).
struct StarRatingInput: View {
    @Binding var rating: Int?

    private static let maxRating = 3

    var body: some View {
        HStack(spacing: 8) {
            ForEach(1...Self.maxRating, id: \.self) { index in
                Button {
                    Haptics.light()
                    if rating == index {
                        rating = nil
                    } else {
                        rating = index
                    }
                } label: {
                    Image(systemName: isFilled(index) ? "star.fill" : "star")
                        .font(.title2)
                        .foregroundStyle(isFilled(index) ? Color.orange : Color.secondary)
                        .contentTransition(.symbolEffect(.replace))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("\(index) \(index == 1 ? "star" : "stars")")
                .accessibilityAddTraits(rating == index ? .isSelected : [])
            }
        }
    }

    private func isFilled(_ index: Int) -> Bool {
        guard let rating else { return false }
        return index <= rating
    }
}

#Preview {
    @Previewable @State var rating: Int? = 2
    StarRatingInput(rating: $rating)
        .padding()
}
