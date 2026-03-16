import SwiftUI

/// Consistent section header used across the home screen.
///
/// Displays a title with an optional "See All" navigation link.
struct SectionHeader: View {
    let title: String
    var seeAllDestination: AppDestination?

    var body: some View {
        HStack {
            Text(title)
                .font(.title3)
                .fontWeight(.semibold)

            Spacer()

            if let seeAllDestination {
                NavigationLink(value: seeAllDestination) {
                    HStack(spacing: 3) {
                        Text("See All")
                            .font(.subheadline)
                            .fontWeight(.medium)
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .fontWeight(.semibold)
                    }
                    .foregroundStyle(.tint)
                }
            }
        }
        .padding(.horizontal)
    }
}
