import SwiftUI
import ClerkKit
import os

/// Root view that routes between loading, sign-in, and the main app based
/// on the current Clerk authentication state.
///
/// When a Clerk session becomes available the view also triggers the Convex
/// client to authenticate (either restoring from cache or performing a fresh
/// login).
struct AuthGateView: View {
    @ObservedObject private var convexService = ConvexService.shared
    private let logger = Logger(subsystem: "com.chaptercheck", category: "AuthGateView")

    var body: some View {
        Group {
            if !Clerk.shared.isLoaded {
                loadingView
                    .onAppear {
                        logger.info("Clerk not loaded yet, showing loading view")
                    }
            } else if Clerk.shared.session != nil {
                switch convexService.authState {
                case .authenticated:
                    MainTabView()
                        .onAppear {
                            logger.info("Convex authenticated, showing MainTabView")
                        }
                case .loading:
                    loadingView
                        .task {
                            logger.info("Clerk session exists, Convex loading — restoring session...")
                            await convexService.restoreSession()
                            logger.info("Convex restoreSession completed, authState=\(String(describing: convexService.authState))")
                        }
                case .unauthenticated:
                    loadingView
                        .task {
                            logger.info("Clerk session exists but Convex unauthenticated — calling login()...")
                            await convexService.login()
                            logger.info("Convex login() completed, authState=\(String(describing: convexService.authState))")
                        }
                }
            } else {
                SignInView()
                    .onAppear {
                        logger.info("Clerk loaded but no session, showing SignInView")
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
