import SwiftUI

/// Capsule-shaped overlay toast that auto-dismisses after a short delay.
///
/// Slides in from the top of the screen and avoids overlapping the mini player.
/// Driven by `ToastMessage` from the `showToast` environment key.
///
/// Position: placed in the ZStack of `MainView`, above the mini player.
struct ToastView: View {
    let toast: ToastMessage
    let onDismiss: () -> Void

    @State private var isVisible = false

    private static let autoDismissDelay: Duration = .seconds(3)

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: toast.style.systemImage)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(toast.style.color)

            Text(toast.message)
                .font(.subheadline)
                .foregroundStyle(.primary)
                .lineLimit(2)
                .multilineTextAlignment(.leading)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 12)
        .background(.regularMaterial, in: Capsule())
        .overlay(
            Capsule()
                .strokeBorder(toast.style.color.opacity(0.25), lineWidth: 1)
        )
        .shadow(color: .black.opacity(0.12), radius: 8, y: 4)
        .padding(.horizontal, 20)
        .opacity(isVisible ? 1 : 0)
        .offset(y: isVisible ? 0 : -20)
        .onAppear {
            withAnimation(.spring(duration: 0.4, bounce: 0.25)) {
                isVisible = true
            }
            Task {
                try? await Task.sleep(for: Self.autoDismissDelay)
                await MainActor.run { dismiss() }
            }
        }
        .accessibilityLabel(toast.message)
        .accessibilityAddTraits(.isStaticText)
    }

    private func dismiss() {
        withAnimation(.easeOut(duration: 0.25)) {
            isVisible = false
        }
        // Give the fade-out animation time to complete before removing from hierarchy
        Task {
            try? await Task.sleep(for: .milliseconds(300))
            await MainActor.run { onDismiss() }
        }
    }
}
