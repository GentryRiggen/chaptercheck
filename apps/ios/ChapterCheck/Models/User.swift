import Foundation

/// Permissions object describing what actions the current user can perform.
/// Matches the `permissions` field returned by `users:getCurrentUserWithPermissions`.
struct UserPermissions: Decodable, Sendable {
    let isAdmin: Bool
    let isEditor: Bool
    let isViewer: Bool
    let hasPremium: Bool
    let canCreateContent: Bool
    let canEditContent: Bool
    let canDeleteContent: Bool
    let canUploadAudio: Bool
    let canPlayAudio: Bool
    let canManageUsers: Bool

    // MARK: - Approval Status

    /// `true` when the user has self-registered and is awaiting admin approval.
    let isPending: Bool
    /// `true` when the user is approved (existing users without `approvalStatus` are treated as approved).
    let isApproved: Bool
    /// `true` when the user can create, rename, and delete bookshelves. Requires approval.
    let canManageShelves: Bool
    /// `true` when the user can follow other users. Requires approval.
    let canFollow: Bool

    // MARK: - Decoding

    private enum CodingKeys: String, CodingKey {
        case isAdmin, isEditor, isViewer, hasPremium
        case canCreateContent, canEditContent, canDeleteContent
        case canUploadAudio, canPlayAudio, canManageUsers
        case isPending, isApproved, canManageShelves, canFollow
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        isAdmin = try container.decode(Bool.self, forKey: .isAdmin)
        isEditor = try container.decode(Bool.self, forKey: .isEditor)
        isViewer = try container.decode(Bool.self, forKey: .isViewer)
        hasPremium = try container.decode(Bool.self, forKey: .hasPremium)
        canCreateContent = try container.decode(Bool.self, forKey: .canCreateContent)
        canEditContent = try container.decode(Bool.self, forKey: .canEditContent)
        canDeleteContent = try container.decode(Bool.self, forKey: .canDeleteContent)
        canUploadAudio = try container.decode(Bool.self, forKey: .canUploadAudio)
        canPlayAudio = try container.decode(Bool.self, forKey: .canPlayAudio)
        canManageUsers = try container.decode(Bool.self, forKey: .canManageUsers)
        // New approval-gating fields — default to non-pending/approved for
        // backward compatibility with older backend deployments.
        isPending = try container.decodeIfPresent(Bool.self, forKey: .isPending) ?? false
        isApproved = try container.decodeIfPresent(Bool.self, forKey: .isApproved) ?? true
        canManageShelves = try container.decodeIfPresent(Bool.self, forKey: .canManageShelves) ?? true
        canFollow = try container.decodeIfPresent(Bool.self, forKey: .canFollow) ?? true
    }
}

/// The current authenticated user with computed permissions.
/// Matches the shape returned by `users:getCurrentUserWithPermissions`.
struct UserWithPermissions: Decodable, Identifiable, Sendable {
    let _id: String
    let clerkId: String
    let email: String
    let name: String?
    let imageUrl: String?
    let role: String
    let hasPremium: Bool
    let isProfilePrivate: Bool
    let permissions: UserPermissions

    var id: String { _id }
    var displayName: String { name ?? email }
}
