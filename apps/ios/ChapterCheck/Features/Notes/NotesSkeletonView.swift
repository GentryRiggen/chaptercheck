import SwiftUI

struct NotesSkeletonView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                statsRibbon
                filterChips
                noteRows

                Spacer().frame(height: 80)
            }
            .padding(.top)
        }
        .scrollDisabled(true)
    }

    private var statsRibbon: some View {
        HStack(spacing: 0) {
            SkeletonView(shape: .rectangle, width: 80, height: 36, cornerRadius: 6)
                .frame(maxWidth: .infinity)
            SkeletonView(shape: .rectangle, width: 80, height: 36, cornerRadius: 6)
                .frame(maxWidth: .infinity)
            SkeletonView(shape: .rectangle, width: 80, height: 36, cornerRadius: 6)
                .frame(maxWidth: .infinity)
        }
        .padding(.horizontal)
    }

    private var filterChips: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                ForEach(0..<5, id: \.self) { _ in
                    SkeletonView(shape: .rectangle, width: 70, height: 32, cornerRadius: 16)
                }
            }
            .padding(.horizontal)
        }
        .scrollDisabled(true)
    }

    private var noteRows: some View {
        VStack(spacing: 12) {
            ForEach(0..<4, id: \.self) { _ in
                HStack(alignment: .top, spacing: 12) {
                    SkeletonView(shape: .rectangle, width: 40, height: 40, cornerRadius: 6)

                    VStack(alignment: .leading, spacing: 6) {
                        SkeletonView(shape: .rectangle, width: 120, height: 12, cornerRadius: 4)
                        SkeletonView(shape: .rectangle, width: 200, height: 14, cornerRadius: 4)
                        SkeletonView(shape: .rectangle, width: 160, height: 12, cornerRadius: 4)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                }
                .padding(.horizontal)
                .padding(.vertical, 10)
                .background(Color(.secondarySystemBackground), in: RoundedRectangle(cornerRadius: 18))
                .padding(.horizontal)
            }
        }
    }
}
