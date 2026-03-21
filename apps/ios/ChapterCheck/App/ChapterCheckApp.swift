import SwiftUI
import ClerkKit

@main
struct ChapterCheckApp: App {
    @State private var themeManager = ThemeManager()
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
                .tint(themeManager.accentColor)
                .preferredColorScheme(themeManager.preferredColorScheme)

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
