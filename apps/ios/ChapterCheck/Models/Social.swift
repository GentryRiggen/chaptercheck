import Foundation

struct FollowedUser: Decodable, Identifiable, Hashable {
    let _id: String
    let name: String?
    let imageUrl: String?
    var id: String { _id }
}

struct FollowStatus: Decodable {
    let isFollowing: Bool
    let followersCount: Double
    let followingCount: Double

    var followersCountInt: Int { Int(followersCount) }
    var followingCountInt: Int { Int(followingCount) }
}

enum ActivityItemType: String, Decodable {
    case review
    case shelfAdd = "shelf_add"
    case publicNote = "public_note"
}

struct ActivityItem: Decodable, Identifiable {
    let _id: String
    let type: ActivityItemType
    let timestamp: Double
    let user: ActivityUser
    let book: ActivityBook
    let rating: Double?
    let reviewText: String?
    let shelfId: String?
    let shelfName: String?
    let noteText: String?
    let entryType: String?
    let sourceText: String?

    var id: String { _id }

    func matchesSearchText(_ text: String) -> Bool {
        let lowered = text.lowercased()
        return book.title.lowercased().contains(lowered)
            || (user.name?.lowercased().contains(lowered) ?? false)
            || (reviewText?.lowercased().contains(lowered) ?? false)
            || (noteText?.lowercased().contains(lowered) ?? false)
            || (shelfName?.lowercased().contains(lowered) ?? false)
    }
}

struct ActivityUser: Decodable, Hashable {
    let _id: String
    let name: String?
    let imageUrl: String?
}

struct ActivityBook: Decodable, Hashable {
    let _id: String
    let title: String
    let coverImageR2Key: String?
}

struct PaginatedActivityResult: Decodable {
    let items: [ActivityItem]
    let nextCursor: Double?
    let hasMore: Bool
}
