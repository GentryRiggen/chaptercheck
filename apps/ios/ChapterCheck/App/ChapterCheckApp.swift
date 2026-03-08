import SwiftUI
import ClerkKit

@main
struct ChapterCheckApp: App {
    @State private var themeManager = ThemeManager()
    @Environment(\.scenePhase) private var scenePhase

    init() {
        Clerk.configure(publishableKey: AppEnvironment.clerkPublishableKey)
    }

    var body: some Scene {
        WindowGroup {
            AuthGateView()
                .environment(themeManager)
                .tint(themeManager.accentColor)
                .preferredColorScheme(themeManager.preferredColorScheme)
        }
        .onChange(of: scenePhase) { _, newPhase in
            if newPhase == .active {
                Task {
                    await ConvexService.shared.refreshTokenNow()
                }
            }
        }
    }
}
