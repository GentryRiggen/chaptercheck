import SwiftUI

/// Skeleton placeholder that mirrors the home screen layout while data loads.
///
/// Shows shimmering placeholders for the hero listening card, secondary
/// listening cards, a shelf row, and a book row — matching the real layout
/// dimensions so the transition to live content feels seamless.
struct HomeSkeletonView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 24) {
                heroSection
                listeningCardsSection
                shelfSection
                bookRowSection

                Spacer().frame(height: 80)
            }
            .padding(.top)
        }
        .scrollDisabled(true)
    }

    // MARK: - Continue Listening Hero

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SkeletonView(shape: .rectangle, width: 180, height: 18, cornerRadius: 4)
                .padding(.horizontal)

            HStack(spacing: 16) {
                SkeletonView(shape: .rectangle, width: 140, height: 210, cornerRadius: 8)

                VStack(alignment: .leading, spacing: 6) {
                    SkeletonView(shape: .rectangle, width: 160, height: 16, cornerRadius: 4)
                    SkeletonView(shape: .rectangle, width: 100, height: 14, cornerRadius: 4)
                    Spacer()
                    VStack(alignment: .leading, spacing: 4) {
                        SkeletonView(shape: .rectangle, width: 200, height: 4, cornerRadius: 2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        SkeletonView(shape: .rectangle, width: 120, height: 10, cornerRadius: 3)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(12)
            .background(.fill.quaternary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .padding(.horizontal)
        }
    }

    // MARK: - Secondary Listening Cards

    private var listeningCardsSection: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                ForEach(0..<3, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 6) {
                        SkeletonView(shape: .rectangle, width: 140, height: 210, cornerRadius: 8)
                        SkeletonView(shape: .rectangle, width: 100, height: 12, cornerRadius: 4)
                        SkeletonView(shape: .rectangle, width: 70, height: 10, cornerRadius: 3)
                    }
                    .frame(width: 140)
                }
            }
            .padding(.horizontal)
        }
        .scrollDisabled(true)
    }

    // MARK: - Shelves Row

    private var shelfSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SkeletonView(shape: .rectangle, width: 150, height: 18, cornerRadius: 4)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(0..<3, id: \.self) { _ in
                        VStack(alignment: .leading, spacing: 8) {
                            SkeletonView(shape: .rectangle, width: 120, height: 180, cornerRadius: 8)
                            SkeletonView(shape: .rectangle, width: 80, height: 12, cornerRadius: 4)
                            SkeletonView(shape: .rectangle, width: 50, height: 10, cornerRadius: 3)
                        }
                        .frame(width: 120)
                    }
                }
                .padding(.horizontal)
            }
            .scrollDisabled(true)
        }
    }

    // MARK: - Top Rated Books Row

    private var bookRowSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            SkeletonView(shape: .rectangle, width: 110, height: 18, cornerRadius: 4)
                .padding(.horizontal)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 12) {
                    ForEach(0..<3, id: \.self) { _ in
                        VStack(alignment: .leading, spacing: 6) {
                            SkeletonView(shape: .rectangle, width: 140, height: 210, cornerRadius: 8)
                            SkeletonView(shape: .rectangle, width: 100, height: 12, cornerRadius: 4)
                            SkeletonView(shape: .rectangle, width: 70, height: 10, cornerRadius: 3)
                        }
                        .frame(width: 140)
                    }
                }
                .padding(.horizontal)
            }
            .scrollDisabled(true)
        }
    }
}

#Preview {
    NavigationStack {
        HomeSkeletonView()
            .navigationTitle("Chapter Check")
    }
}
