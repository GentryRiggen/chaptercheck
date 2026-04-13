import Foundation
import SwiftUI

/// Stages a destination parsed from an incoming Universal Link so `MainView`
/// can consume it once the user is authenticated and the tab bar is onscreen.
///
/// Links arrive via `.onOpenURL` (when the app is already running) or
/// `.onContinueUserActivity(NSUserActivityTypeBrowsingWeb)` (when iOS launches
/// the app in response to tapping an https URL). Both funnel into `handle(url:)`.
///
/// Web URL → destination mapping mirrors `apps/web/app/**`:
/// - `/books/{id}`    → `.book(id:)`    (library tab)
/// - `/authors/{id}`  → `.author(id:)`  (library tab)
/// - `/series/{id}`   → `.series(id:)`  (library tab)
/// - `/shelves/{id}`  → `.shelf(id:)`   (library tab)
/// - `/users/{id}`    → `.profile(id:)` (social tab)
///
/// The AASA file at `/.well-known/apple-app-site-association` on
/// chaptercheck.com must include matching path patterns for iOS to route
/// these URLs into the app.
@MainActor
@Observable
final class DeepLinkRouter {
    /// Destination awaiting navigation. Consumed by `MainView` via `consume()`.
    private(set) var pendingDestination: AppDestination?
    /// Tab to activate when consuming the pending destination.
    private(set) var pendingTab: Tab?

    /// Parses an incoming URL and stages a destination. Returns `true` if the
    /// URL matched a known route (the app should consider the link handled).
    @discardableResult
    func handle(url: URL) -> Bool {
        guard url.scheme == "https",
              let host = url.host?.lowercased(),
              host == "chaptercheck.com" || host == "www.chaptercheck.com"
        else {
            return false
        }

        let segments = url.pathComponents.filter { $0 != "/" }
        guard segments.count >= 2 else { return false }
        let section = segments[0]
        let id = segments[1]
        guard Self.isValidID(id) else { return false }

        switch section {
        case "books":
            stage(.book(id: id), tab: .library)
        case "authors":
            stage(.author(id: id), tab: .library)
        case "series":
            stage(.series(id: id), tab: .library)
        case "shelves":
            stage(.shelf(id: id), tab: .library)
        case "users":
            stage(.profile(userId: id), tab: .social)
        default:
            return false
        }
        return true
    }

    /// Returns and clears the pending destination, if any.
    func consume() -> (destination: AppDestination, tab: Tab)? {
        guard let destination = pendingDestination, let tab = pendingTab else {
            return nil
        }
        pendingDestination = nil
        pendingTab = nil
        return (destination, tab)
    }

    private func stage(_ destination: AppDestination, tab: Tab) {
        pendingDestination = destination
        pendingTab = tab
    }

    /// Rejects anything that isn't a plausible Convex ID — alphanumeric plus
    /// the couple of separator chars Convex uses. This is defense in depth:
    /// Apple's AASA matcher already restricts inbound URLs to `/books/*` etc.,
    /// but validating here keeps malformed paths (`..`, empty, whitespace)
    /// from reaching the navigation stack.
    private static func isValidID(_ id: String) -> Bool {
        guard !id.isEmpty, id.count <= 128 else { return false }
        let allowed = CharacterSet.alphanumerics.union(CharacterSet(charactersIn: "-_"))
        return id.unicodeScalars.allSatisfy { allowed.contains($0) }
    }
}
