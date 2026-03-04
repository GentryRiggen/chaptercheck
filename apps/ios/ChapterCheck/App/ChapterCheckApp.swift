import SwiftUI
import ClerkKit

@main
struct ChapterCheckApp: App {
    @State private var themeManager = ThemeManager()

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
    }
}
