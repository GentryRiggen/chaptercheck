import SwiftUI

struct SocialSkeletonView: View {
    var body: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Segmented picker placeholder
                SkeletonView(shape: .rectangle, height: 32, cornerRadius: 8)
                    .padding(.horizontal)

                // Filter chips placeholder
                HStack(spacing: 8) {
                    ForEach(0..<3, id: \.self) { _ in
                        SkeletonView(shape: .rectangle, width: 80, height: 28, cornerRadius: 14)
                    }
                    Spacer()
                }
                .padding(.horizontal)

                // Activity items
                VStack(spacing: 0) {
                    ForEach(0..<5, id: \.self) { index in
                        activityItemSkeleton
                        if index < 4 {
                            Divider()
                                .padding(.horizontal)
                        }
                    }
                }

                Spacer().frame(height: 80)
            }
            .padding(.top)
        }
        .scrollDisabled(true)
    }

    private var activityItemSkeleton: some View {
        HStack(alignment: .top, spacing: 12) {
            // Book cover
            SkeletonView(shape: .rectangle, width: 56, height: 56, cornerRadius: 6)

            VStack(alignment: .leading, spacing: 6) {
                // User avatar + action text
                HStack(spacing: 6) {
                    SkeletonView(shape: .circle, width: 20, height: 20)
                    SkeletonView(shape: .rectangle, width: 160, height: 12, cornerRadius: 3)
                }

                // Book title
                SkeletonView(shape: .rectangle, width: 180, height: 14, cornerRadius: 4)

                // Timestamp
                SkeletonView(shape: .rectangle, width: 50, height: 10, cornerRadius: 3)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(.horizontal)
        .padding(.vertical, 10)
    }
}
