import SwiftUI

/// Error message display with an optional retry button.
///
/// Centered in available space, suitable for both full-screen and
/// inline error states.
struct ErrorView: View {
    let message: String
    var onRetry: (() -> Void)?

    var body: some View {
        ContentUnavailableView {
            Label("Something Went Wrong", systemImage: "exclamationmark.triangle")
        } description: {
            Text(message)
        } actions: {
            if let onRetry {
                Button("Retry") {
                    onRetry()
                }
                .buttonStyle(.bordered)
            }
        }
    }
}

#Preview {
    ErrorView(message: "Failed to load data. Please check your connection.") {
        // retry action
    }
}
