import Foundation

/// Value-based navigation destinations used with `NavigationStack` and
/// `.navigationDestination(for:)`.
///
/// Since book, author, and series IDs are all `String`, we use a typed
/// enum to disambiguate between them in the navigation system.
enum AppDestination: Hashable {
    case book(id: String)
    case author(id: String)
    case series(id: String)
}
