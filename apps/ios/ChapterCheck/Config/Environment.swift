import Foundation

enum AppEnvironment {
    #if DEBUG
    static let convexUrl = "https://exciting-pika-251.convex.cloud"
    static let clerkPublishableKey = "pk_test_Z2VudWluZS13cmVuLTQ5LmNsZXJrLmFjY291bnRzLmRldiQ"
    #else
    static let convexUrl = "https://wandering-mouse-765.convex.cloud"
    static let clerkPublishableKey = "pk_live_Y2xlcmsuY2hhcHRlcmNoZWNrLmNvbSQ"
    #endif
}
