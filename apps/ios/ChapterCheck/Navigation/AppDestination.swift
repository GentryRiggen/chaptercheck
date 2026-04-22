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
    case shelf(id: String)
    case profile(userId: String)
    case browseLibrary(initialSort: SortOption = .titleAsc)
    case browseAuthors
    case browseShelves
    case allReadingHistory(userId: String, initialStatus: ReadingStatus? = nil)
    case allUserReviews(userId: String)
    case followers(userId: String)
    case following(userId: String)
    case userSearch
    case messages
    case conversation(otherUserId: String)
    case composeMessage
}
