import SwiftUI

/// Compact offline status banner reused across screens.
///
/// Shows a `wifi.slash` icon with "You're offline" text.
/// Appears at the top of scrollable content when the device has no network.
struct OfflineBanner: View {
    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: "wifi.slash")
                .font(.subheadline)
                .foregroundStyle(.orange)

            Text("You're offline")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .padding(.vertical, 4)
    }
}
