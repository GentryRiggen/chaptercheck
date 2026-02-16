import SwiftUI
import ClerkKit

@main
struct ChapterCheckApp: App {
    init() {
        Clerk.configure(publishableKey: AppEnvironment.clerkPublishableKey)
    }

    var body: some Scene {
        WindowGroup {
            AuthGateView()
        }
    }
}
