import SwiftUI

/// Placeholder for the Social tab — will contain activity feed and friend features.
struct SocialView: View {
    var body: some View {
        ContentUnavailableView(
            "Social",
            systemImage: "person.2",
            description: Text("Coming soon")
        )
        .navigationTitle("Social")
    }
}
