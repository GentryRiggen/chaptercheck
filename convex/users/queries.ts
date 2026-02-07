import { v } from "convex/values";

import { query } from "../_generated/server";
import {
  getCurrentUser,
  getEffectiveRole,
  hasPremium,
  hasRoleLevel,
  requireAuth,
} from "../lib/auth";

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
      isProfilePrivate: user.isProfilePrivate ?? false,
      permissions,
    };
  },
});

/**
 * Get a user's profile information
 * Returns basic info for all users, full stats only if profile is public or viewing own profile
 */
export const getUserProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { user: currentUser } = await requireAuth(ctx);
    const targetUser = await ctx.db.get(args.userId);

    if (!targetUser) {
      return null;
    }

    const isOwnProfile = currentUser._id === targetUser._id;
    const isProfilePrivate = targetUser.isProfilePrivate ?? false;

    // Basic info available to all authenticated users
    const basicInfo = {
      _id: targetUser._id,
      name: targetUser.name,
      imageUrl: targetUser.imageUrl,
      createdAt: targetUser.createdAt,
      isOwnProfile,
      isProfilePrivate,
    };

    // If profile is private and not own profile, return limited data
    if (isProfilePrivate && !isOwnProfile) {
      return {
        ...basicInfo,
        stats: null,
      };
    }

    // Get stats for public profiles or own profile
    const allUserData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user", (q) => q.eq("userId", targetUser._id))
      .collect();

    // Count read books (respecting per-book privacy for non-own profiles)
    const readBooks = isOwnProfile
      ? allUserData.filter((d) => d.isRead)
      : allUserData.filter((d) => d.isRead && !d.isReadPrivate);

    // Count reviews (respecting per-review privacy for non-own profiles)
    const reviews = isOwnProfile
      ? allUserData.filter((d) => d.rating !== undefined || d.reviewText)
      : allUserData.filter((d) => (d.rating !== undefined || d.reviewText) && !d.isReviewPrivate);

    // Count shelves (public only for non-own profiles)
    const allShelves = await ctx.db
      .query("shelves")
      .withIndex("by_user", (q) => q.eq("userId", targetUser._id))
      .collect();
    const shelvesCount = isOwnProfile
      ? allShelves.length
      : allShelves.filter((s) => s.isPublic).length;

    return {
      ...basicInfo,
      stats: {
        booksRead: readBooks.length,
        reviewsWritten: reviews.length,
        shelvesCount,
      },
    };
  },
});
