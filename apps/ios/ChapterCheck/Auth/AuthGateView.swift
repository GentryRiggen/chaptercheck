import SwiftUI
import ClerkKit

/// Root view that routes between loading, sign-in, and the main app based
/// on the current Clerk authentication state.
///
/// When a Clerk session becomes available the view also triggers the Convex
/// client to authenticate (either restoring from cache or performing a fresh
/// login).
struct AuthGateView: View {
    @ObservedObject private var convexService = ConvexService.shared

    var body: some View {
        Group {
            if !Clerk.shared.isLoaded {
                loadingView
            } else if Clerk.shared.session != nil {
                MainTabView()
                    .task {
                        await convexService.restoreSession()
                    }
            } else {
                SignInView()
            }
        }
        .animation(.default, value: Clerk.shared.session != nil)
    }

    private var loadingView: some View {
        VStack(spacing: 16) {
            ProgressView()
                .controlSize(.large)
            Text("Loading...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
    }
}
