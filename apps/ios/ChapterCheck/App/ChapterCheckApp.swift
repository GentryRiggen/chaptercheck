import SwiftUI
import ClerkKit

@main
struct ChapterCheckApp: App {
    @State private var themeManager = ThemeManager()
    @State private var deepLinkRouter = DeepLinkRouter()
    @ObservedObject private var convexService = ConvexService.shared
    @Environment(\.scenePhase) private var scenePhase
    private let networkMonitor = NetworkMonitor.shared

    init() {
        // Sentry must be initialized before any other SDKs so that crashes
        // during Clerk/Convex setup are captured correctly.
        SentryService.start()
        Clerk.configure(publishableKey: AppEnvironment.clerkPublishableKey)
    }

    var body: some Scene {
        WindowGroup {
            AuthGateView()
                .id(convexService.resetID)
                .environment(themeManager)
                .environment(deepLinkRouter)
                .tint(themeManager.accentColor)
                .preferredColorScheme(themeManager.preferredColorScheme)
                .onOpenURL { url in
                    // Called when a Universal Link is tapped while the app is
                    // already running in the foreground/background.
                    deepLinkRouter.handle(url: url)
                }
                .onContinueUserActivity(NSUserActivityTypeBrowsingWeb) { activity in
                    // Called when the app is launched by tapping a Universal
                    // Link from Safari, Messages, Mail, etc.
                    if let url = activity.webpageURL {
                        deepLinkRouter.handle(url: url)
                    }
                }

        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .background {
                ConvexService.shared.appDidEnterBackground()
            } else if newPhase == .active {
                Task {
                    await ConvexService.shared.appDidBecomeActive()
                }
            }
        }
        .onChange(of: networkMonitor.isConnected) { wasConnected, isConnected in
            guard !wasConnected && isConnected else { return }
            Task {
                await ConvexService.shared.handleNetworkRestored()
            }
        }
    }
}
