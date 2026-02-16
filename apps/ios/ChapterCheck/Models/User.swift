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
