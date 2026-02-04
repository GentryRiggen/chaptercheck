import { query } from "../_generated/server";
import { getCurrentUser, getEffectiveRole, hasPremium, hasRoleLevel } from "../lib/auth";

/**
 * Permissions object returned by getCurrentUserWithPermissions
 * Used by frontend to show/hide/disable UI elements
 */
export interface UserPermissions {
  // Role checks
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;

  // Premium check
  hasPremium: boolean;

  // Computed permissions for specific actions
  canCreateContent: boolean; // Create books, authors, series
  canEditContent: boolean; // Edit books, authors, series
  canDeleteContent: boolean; // Delete books, authors, series
  canUploadAudio: boolean; // Upload audio files (requires premium)
  canPlayAudio: boolean; // Play audio files (requires premium)
  canManageUsers: boolean; // Admin-only: change user roles/premium
}

/**
 * Get current user with computed permissions
 * Returns null if not authenticated
 */
export const getCurrentUserWithPermissions = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);

    if (!user) {
      return null;
    }

    const effectiveRole = getEffectiveRole(user);
    const isPremium = hasPremium(user);

    const isAdmin = hasRoleLevel(user, "admin");
    const isEditor = hasRoleLevel(user, "editor");

    const permissions: UserPermissions = {
      // Role checks
      isAdmin,
      isEditor,
      isViewer: true, // All authenticated users are at least viewers

      // Premium check
      hasPremium: isPremium,

      // Computed permissions
      canCreateContent: isEditor,
      canEditContent: isEditor,
      canDeleteContent: isEditor,
      canUploadAudio: isPremium,
      canPlayAudio: isPremium,
      canManageUsers: isAdmin,
    };

    return {
      _id: user._id,
      clerkId: user.clerkId,
      email: user.email,
      name: user.name,
      imageUrl: user.imageUrl,
      role: effectiveRole,
      hasPremium: isPremium,
      permissions,
    };
  },
});
