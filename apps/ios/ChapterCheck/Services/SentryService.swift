import Foundation
import Sentry

/// Application-wide wrapper for the Sentry SDK.
///
/// Call `SentryService.start()` once at app launch (before any user sessions
/// are established) to initialize the SDK with environment-appropriate settings.
/// Subsequent calls to `capture` and `addBreadcrumb` are safe to call from any
/// thread or isolation context — the Sentry SDK handles thread-safety internally.
///
/// Design notes:
/// - Debug builds use a 1.0 trace sample rate so every session is visible
///   during development, but `attachScreenshot` and `attachViewHierarchy` are
///   disabled to avoid leaking UI content from other developers' devices.
/// - Release builds use a conservative 0.2 trace sample rate and 1.0 error
///   sample rate to capture all crashes while limiting performance-trace volume.
/// - If the DSN is the placeholder value the service is a no-op, which lets
///   the project compile and run cleanly before a real DSN is configured.
enum SentryService {

    // MARK: - Bootstrap

    /// Initialize the Sentry SDK. Call once from `ChapterCheckApp.init()`.
    static func start() {
        let dsn = AppEnvironment.sentryDsn
        guard dsn != "YOUR_SENTRY_DSN", !dsn.isEmpty else {
            return
        }

        SentrySDK.start { options in
            options.dsn = dsn
            options.environment = environment

            // Capture 100 % of errors in all configurations.
            options.sampleRate = 1.0

            #if DEBUG
            options.debug = false
            options.tracesSampleRate = 1.0
            options.profilesSampleRate = 1.0
            options.attachScreenshot = false
            options.attachViewHierarchy = false
            #else
            options.debug = false
            options.tracesSampleRate = 0.2
            options.profilesSampleRate = 0.2
            options.attachScreenshot = false
            options.attachViewHierarchy = false
            #endif

            // Breadcrumbs — keep a generous window so we can reconstruct what
            // the user was doing before a crash.
            options.maxBreadcrumbs = 100

            // Automatically captures unhandled Swift errors and crashes.
            options.enableCrashHandler = true
            options.enableAutoSessionTracking = true

            // Reduce noise: silence the Sentry console output in production.
        }
    }

    // MARK: - Error Capture

    /// Capture a Swift `Error` with optional context.
    ///
    /// - Parameters:
    ///   - error: The error to report.
    ///   - context: A short label describing where the error originated
    ///     (e.g., `"AudioPlayer.loadStream"`). Attached as a tag so errors
    ///     are easy to filter in the Sentry dashboard.
    ///   - extras: Optional key/value pairs that appear in the "Additional Data"
    ///     section of the Sentry event. Keep values `Sendable`-safe primitives.
    static func capture(
        _ error: Error,
        context: String,
        extras: [String: Any] = [:]
    ) {
        SentrySDK.capture(error: error) { scope in
            scope.setTag(value: context, key: "error_context")
            for (key, value) in extras {
                scope.setExtra(value: value, key: key)
            }
        }
    }

    /// Capture a plain-text message (e.g., an unexpected state that isn't an
    /// `Error` but warrants investigation).
    ///
    /// - Parameters:
    ///   - message: A human-readable description of the situation.
    ///   - level: Sentry severity level (default `.warning`).
    ///   - context: Short origin label attached as a tag.
    static func capture(
        message: String,
        level: SentryLevel = .warning,
        context: String,
        extras: [String: Any] = [:]
    ) {
        SentrySDK.capture(message: message) { scope in
            scope.setLevel(level)
            scope.setTag(value: context, key: "error_context")
            for (key, value) in extras {
                scope.setExtra(value: value, key: key)
            }
        }
    }

    // MARK: - Breadcrumbs

    /// Add a breadcrumb that will appear in the event trail for any subsequent error.
    ///
    /// - Parameters:
    ///   - message: Short, human-readable description of the action.
    ///   - category: Logical grouping (e.g., `"audio"`, `"download"`, `"convex"`).
    ///   - level: Sentry severity level (default `.info`).
    ///   - data: Optional additional data attached to the breadcrumb.
    static func addBreadcrumb(
        message: String,
        category: String,
        level: SentryLevel = .info,
        data: [String: Any] = [:]
    ) {
        let crumb = Breadcrumb(level: level, category: category)
        crumb.message = message
        crumb.type = "default"
        if !data.isEmpty {
            crumb.data = data
        }
        SentrySDK.addBreadcrumb(crumb)
    }

    // MARK: - User Identity

    /// Attach a user identifier to all subsequent events.
    ///
    /// Call this after successful Clerk authentication. Do **not** send PII
    /// (email, name) — use an opaque Convex user ID only.
    static func setUser(id: String) {
        let user = User()
        user.userId = id
        SentrySDK.setUser(user)
    }

    /// Clear user context (call on sign-out).
    static func clearUser() {
        SentrySDK.setUser(nil)
    }

    // MARK: - Private

    private static var environment: String {
        #if DEBUG
        return "development"
        #else
        return "production"
        #endif
    }
}
