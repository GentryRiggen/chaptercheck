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
    private let networkMonitor = NetworkMonitor.shared

    /// Persisted flag: set `true` after the first successful Convex authentication.
    /// Used to allow offline bypass on subsequent app launches.
    private static let hasAuthenticatedBeforeKey = "hasAuthenticatedBefore"

    private var hasAuthenticatedBefore: Bool {
        UserDefaults.standard.bool(forKey: Self.hasAuthenticatedBeforeKey)
    }

    /// Allow offline access when: we're offline, the user previously logged in,
    /// and Clerk has loaded (even if its session is stale/nil).
    private var allowOfflineBypass: Bool {
        !networkMonitor.isConnected && hasAuthenticatedBefore
    }

    private var showMainTab: Bool {
        // Offline bypass — show main UI to access downloaded books
        if allowOfflineBypass { return true }

        guard Clerk.shared.isLoaded, Clerk.shared.session != nil else { return false }
        if case .authenticated = convexService.authState { return true }
        // Keep MainView mounted through transient loading/unauthenticated
        // states once we've been authenticated at least once this session.
        return hasAuthenticated
    }

    var body: some View {
        Group {
            if allowOfflineBypass {
                MainView()
                    .onAppear {
                        logger.info("Offline bypass — showing MainView with downloaded content")
                    }
            } else if !Clerk.shared.isLoaded {
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
                        UserDefaults.standard.set(true, forKey: Self.hasAuthenticatedBeforeKey)
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
