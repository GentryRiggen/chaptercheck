import Foundation

/// Block status between the current user and another user.
///
/// `isBlocked` — current user has blocked this other user.
/// `isBlockedBy` — this other user has blocked the current user.
struct BlockStatus: Decodable {
    let isBlocked: Bool
    let isBlockedBy: Bool
}

/// A user that the current user has blocked, as returned by `getMyBlockedUsers`.
struct BlockedUser: Decodable, Identifiable, Hashable {
    let _id: String
    let name: String?
    let imageUrl: String?

    var id: String { _id }
    var displayName: String { name ?? "Unknown User" }
}
