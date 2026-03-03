import SwiftUI
import ClerkKit
import os

/// Root view that routes between loading, sign-in, and the main app based
/// on the current Clerk authentication state.
///
/// When a Clerk session becomes available the view also triggers the Convex
/// client to authenticate (either restoring from cache or performing a fresh
/// login).
///
/// Once authenticated, `MainView` stays mounted through transient `.loading`
/// states (e.g. token refresh) to preserve navigation, playback, and downloads.
struct AuthGateView: View {
    @ObservedObject private var convexService = ConvexService.shared
    @State private var hasAuthenticated = false
    private let logger = Logger(subsystem: "com.chaptercheck", category: "AuthGateView")

    private var showMainTab: Bool {
        guard Clerk.shared.isLoaded, Clerk.shared.session != nil else { return false }
        if case .authenticated = convexService.authState { return true }
        // Keep MainView mounted through transient loading/unauthenticated
        // states once we've been authenticated at least once this session.
        return hasAuthenticated
    }

    var body: some View {
        Group {
            if !Clerk.shared.isLoaded {
                loadingView
                    .onAppear {
                        logger.info("Clerk not loaded yet, showing loading view")
                    }
            } else if Clerk.shared.session == nil {
                SignInView()
                    .onAppear {
                        hasAuthenticated = false
                        logger.info("Clerk loaded but no session, showing SignInView")
                    }
            } else if showMainTab {
                MainView()
                    .onAppear {
                        hasAuthenticated = true
                    }
            } else {
                // Initial authentication (not yet authenticated this session)
                loadingView
                    .task {
                        switch convexService.authState {
                        case .loading:
                            logger.info("Clerk session exists, Convex loading — restoring session...")
                            await convexService.restoreSession()
                        case .unauthenticated:
                            logger.info("Clerk session exists but Convex unauthenticated — calling login()...")
                            await convexService.login()
                        case .authenticated:
                            break
                        }
                    }
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
