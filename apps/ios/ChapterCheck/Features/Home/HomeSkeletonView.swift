import SwiftUI

/// Skeleton placeholder that mirrors the home screen layout while data loads.
///
/// Shows shimmering placeholders for the greeting, stats, hero listening card,
/// secondary listening cards, shelves, and book rows — matching the real layout
/// dimensions so the transition to live content feels seamless.
struct HomeSkeletonView: View {
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 28) {
                greetingSection
                heroSection
                listeningCardsSection
                shelfSection
                bookRowSection

                Spacer().frame(height: 80)
            }
            .padding(.top, 4)
            .padding(.horizontal)
        }
        .scrollDisabled(true)
    }

    // MARK: - Greeting + Stats

    private var greetingSection: some View {
        VStack(alignment: .leading, spacing: 16) {
            SkeletonView(shape: .rectangle, width: 170, height: 22, cornerRadius: 6)

            HStack(spacing: 12) {
                ForEach(0..<3, id: \.self) { _ in
                    HStack(spacing: 8) {
                        SkeletonView(shape: .rectangle, width: 36, height: 36, cornerRadius: 10)
                        VStack(alignment: .leading, spacing: 3) {
                            SkeletonView(shape: .rectangle, width: 40, height: 14, cornerRadius: 4)
                            SkeletonView(shape: .rectangle, width: 55, height: 10, cornerRadius: 3)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(.fill.quaternary)
                    .clipShape(RoundedRectangle(cornerRadius: 14))
                }
            }
        }
    }

    // MARK: - Continue Listening Hero

    private var heroSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SkeletonView(shape: .rectangle, width: 180, height: 18, cornerRadius: 4)

            HStack(spacing: 14) {
                SkeletonView(shape: .rectangle, width: 80, height: 120, cornerRadius: 8)

                VStack(alignment: .leading, spacing: 6) {
                    SkeletonView(shape: .rectangle, width: 140, height: 14, cornerRadius: 4)
                    SkeletonView(shape: .rectangle, width: 90, height: 12, cornerRadius: 4)
                    Spacer(minLength: 0)
                    VStack(alignment: .leading, spacing: 5) {
                        SkeletonView(shape: .rectangle, width: 200, height: 4, cornerRadius: 2)
                            .frame(maxWidth: .infinity, alignment: .leading)
                        SkeletonView(shape: .rectangle, width: 110, height: 10, cornerRadius: 3)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(.fill.quaternary)
            )
        }
    }

    // MARK: - Secondary Listening Cards

    private var listeningCardsSection: some View {
        HStack(spacing: 12) {
            ForEach(0..<3, id: \.self) { _ in
                VStack(alignment: .leading, spacing: 8) {
                    RoundedRectangle(cornerRadius: 8)
                        .fill(.fill.tertiary)
                        .aspectRatio(2 / 3, contentMode: .fit)
                    SkeletonView(shape: .rectangle, width: 80, height: 12, cornerRadius: 4)
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    // MARK: - Shelves Row

    private var shelfSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SkeletonView(shape: .rectangle, width: 150, height: 18, cornerRadius: 4)

            HStack(spacing: 12) {
                ForEach(0..<3, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 8) {
                        RoundedRectangle(cornerRadius: 10)
                            .fill(.fill.tertiary)
                            .aspectRatio(2 / 3, contentMode: .fit)
                        SkeletonView(shape: .rectangle, width: 80, height: 12, cornerRadius: 4)
                        SkeletonView(shape: .rectangle, width: 50, height: 10, cornerRadius: 3)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }

    // MARK: - Top Rated Books Row

    private var bookRowSection: some View {
        VStack(alignment: .leading, spacing: 14) {
            SkeletonView(shape: .rectangle, width: 110, height: 18, cornerRadius: 4)

            HStack(spacing: 12) {
                ForEach(0..<3, id: \.self) { _ in
                    VStack(alignment: .leading, spacing: 6) {
                        RoundedRectangle(cornerRadius: 8)
                            .fill(.fill.tertiary)
                            .aspectRatio(2 / 3, contentMode: .fit)
                        SkeletonView(shape: .rectangle, width: 80, height: 12, cornerRadius: 4)
                        SkeletonView(shape: .rectangle, width: 60, height: 10, cornerRadius: 3)
                    }
                    .frame(maxWidth: .infinity)
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        HomeSkeletonView()
            .navigationTitle("Chapter Check")
    }
}
