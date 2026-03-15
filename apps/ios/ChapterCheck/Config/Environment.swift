import Foundation

enum AppEnvironment {
    #if DEBUG
    static let convexUrl = "https://exciting-pika-251.convex.cloud"
    static let clerkPublishableKey = "pk_test_Z2VudWluZS13cmVuLTQ5LmNsZXJrLmFjY291bnRzLmRldiQ"
    /// Sentry DSN for the ChapterCheck iOS project.
    /// Replace "YOUR_SENTRY_DSN" with the DSN from your Sentry project settings.
    static let sentryDsn = "https://8cd0fee4e92cc451c44c8f828e2c374c@o4511046043041792.ingest.us.sentry.io/4511046044221440"
    #else
    static let convexUrl = "https://wandering-mouse-765.convex.cloud"
    static let clerkPublishableKey = "pk_live_Y2xlcmsuY2hhcHRlcmNoZWNrLmNvbSQ"
    /// Sentry DSN for the ChapterCheck iOS project.
    /// Replace "YOUR_SENTRY_DSN" with the DSN from your Sentry project settings.
    static let sentryDsn = "https://8cd0fee4e92cc451c44c8f828e2c374c@o4511046043041792.ingest.us.sentry.io/4511046044221440"
    #endif
}
