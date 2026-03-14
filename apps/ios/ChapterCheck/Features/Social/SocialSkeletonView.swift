import SwiftUI

struct SocialSkeletonView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                // Section header
                SkeletonView(shape: .rectangle, width: 120, height: 18, cornerRadius: 4)
                    .padding(.horizontal)

                // Activity items
                ForEach(0..<4, id: \.self) { _ in
                    activityItemSkeleton
                }

                Spacer().frame(height: 80)
            }
            .padding(.top)
        }
        .scrollDisabled(true)
    }

    private var activityItemSkeleton: some View {
        HStack(alignment: .top, spacing: 12) {
            SkeletonView(shape: .circle, width: 32, height: 32)

            VStack(alignment: .leading, spacing: 8) {
                SkeletonView(shape: .rectangle, width: 200, height: 14, cornerRadius: 4)

                HStack(spacing: 10) {
                    SkeletonView(shape: .rectangle, width: 40, height: 60, cornerRadius: 4)
                    SkeletonView(shape: .rectangle, width: 140, height: 14, cornerRadius: 4)
                }

                SkeletonView(shape: .rectangle, width: 60, height: 10, cornerRadius: 3)
            }
        }
        .padding(.horizontal)
    }
}
