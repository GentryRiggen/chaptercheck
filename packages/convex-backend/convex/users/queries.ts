import { v } from "convex/values";

import { query } from "../_generated/server";
import {
  getCurrentUser,
  getEffectiveRole,
  hasPremium,
  hasRoleLevel,
  isApprovedUser,
  requireAdmin,
  requireAuth,
} from "../lib/auth";
import { isBookFinished } from "../lib/bookUserData";

/**
 * Permissions object returned by getCurrentUserWithPermissions
 * Used by frontend to show/hide/disable UI elements
 */
export interface UserPermissions {
  // Role checks
  isAdmin: boolean;
  isEditor: boolean;
  isViewer: boolean;

  // Approval checks
  isPending: boolean;
  isApproved: boolean;

  // Premium check
  hasPremium: boolean;

  // Computed permissions for specific actions
  canCreateContent: boolean; // Create books, authors, series
  canEditContent: boolean; // Edit books, authors, series
  canDeleteContent: boolean; // Delete books, authors, series
  canUploadAudio: boolean; // Upload audio files (requires premium + approved)
  canPlayAudio: boolean; // Play audio files (requires premium + approved)
  canManageUsers: boolean; // Admin-only: change user roles/premium
  canManageShelves: boolean; // Requires approved
  canFollow: boolean; // Requires approved
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
    const approved = isApprovedUser(user);

    const isAdmin = hasRoleLevel(user, "admin");
    const isEditor = hasRoleLevel(user, "editor");

    const permissions: UserPermissions = {
      // Role checks
      isAdmin,
      isEditor,
      isViewer: true, // All authenticated users are at least viewers

      // Approval checks
      isPending: !approved,
      isApproved: approved,

      // Premium check
      hasPremium: isPremium,

      // Computed permissions
      canCreateContent: isEditor,
      canEditContent: isEditor,
      canDeleteContent: isEditor,
      canUploadAudio: isPremium && approved,
      canPlayAudio: isPremium && approved,
      canManageUsers: isAdmin,
      canManageShelves: approved,
      canFollow: approved,
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
      approvalStatus: user.approvalStatus ?? "approved",
      permissions,
    };
  },
});

/**
 * List all users with storage account info (admin-only)
 */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();

    const usersWithStorage = await Promise.all(
      users.map(async (user) => {
        const storageAccount = user.storageAccountId
          ? await ctx.db.get(user.storageAccountId)
          : null;

        return {
          _id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          imageUrl: user.imageUrl,
          role: getEffectiveRole(user),
          hasPremium: hasPremium(user),
          approvalStatus: user.approvalStatus ?? "approved",
          storageAccountId: user.storageAccountId,
          storageAccount: storageAccount
            ? {
                _id: storageAccount._id,
                name: storageAccount.name,
                r2PathPrefix: storageAccount.r2PathPrefix,
                totalBytesUsed: storageAccount.totalBytesUsed,
                fileCount: storageAccount.fileCount,
              }
            : null,
          createdAt: user.createdAt,
        };
      })
    );

    return usersWithStorage;
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

    // Follow counts
    const followersCount = (
      await ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingId", args.userId))
        .collect()
    ).length;

    const followingCount = (
      await ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
        .collect()
    ).length;

    const isFollowedByMe = isOwnProfile
      ? false
      : (await ctx.db
          .query("follows")
          .withIndex("by_follower_and_following", (q) =>
            q.eq("followerId", currentUser._id).eq("followingId", args.userId)
          )
          .unique()) !== null;

    // Basic info available to all authenticated users
    const basicInfo = {
      _id: targetUser._id,
      name: targetUser.name,
      imageUrl: targetUser.imageUrl,
      createdAt: targetUser.createdAt,
      isOwnProfile,
      isProfilePrivate,
      followersCount,
      followingCount,
      isFollowedByMe,
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
      ? allUserData.filter((d) => isBookFinished(d))
      : allUserData.filter((d) => isBookFinished(d) && !d.isReadPrivate);

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

/**
 * Get full user detail for the admin drill-in page.
 * This intentionally bypasses normal profile privacy rules.
 */
export const getAdminUserDetail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      return null;
    }

    const [allUserData, allShelves, listeningRecords, storageAccount] = await Promise.all([
      ctx.db
        .query("bookUserData")
        .withIndex("by_user", (q) => q.eq("userId", targetUser._id))
        .collect(),
      ctx.db
        .query("shelves")
        .withIndex("by_user", (q) => q.eq("userId", targetUser._id))
        .collect(),
      ctx.db
        .query("listeningProgress")
        .withIndex("by_user_and_lastListened", (q) => q.eq("userId", targetUser._id))
        .collect(),
      targetUser.storageAccountId ? ctx.db.get(targetUser.storageAccountId) : Promise.resolve(null),
    ]);

    const readBooks = allUserData.filter((d) => d.isRead);
    const reviews = allUserData.filter((d) => d.rating !== undefined || d.reviewText);

    return {
      _id: targetUser._id,
      clerkId: targetUser.clerkId,
      email: targetUser.email,
      name: targetUser.name,
      imageUrl: targetUser.imageUrl,
      role: getEffectiveRole(targetUser),
      hasPremium: hasPremium(targetUser),
      approvalStatus: targetUser.approvalStatus ?? "approved",
      isProfilePrivate: targetUser.isProfilePrivate ?? false,
      createdAt: targetUser.createdAt,
      storageAccountId: targetUser.storageAccountId,
      storageAccount: storageAccount
        ? {
            _id: storageAccount._id,
            name: storageAccount.name,
            r2PathPrefix: storageAccount.r2PathPrefix,
            totalBytesUsed: storageAccount.totalBytesUsed,
            fileCount: storageAccount.fileCount,
          }
        : null,
      stats: {
        booksRead: readBooks.length,
        reviewsWritten: reviews.length,
        shelvesCount: allShelves.length,
        listeningBooks: listeningRecords.length,
      },
    };
  },
});

/**
 * Search users by name
 * Returns matching users excluding the current user
 */
export const searchUsers = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const trimmed = args.query.trim();
    if (!trimmed) return [];

    const results = await ctx.db
      .query("users")
      .withSearchIndex("search_users", (q) => q.search("name", trimmed))
      .take(20);

    return results
      .filter((u) => u._id !== user._id)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        imageUrl: u.imageUrl,
      }));
  },
});

/**
 * List users pending approval (admin-only)
 */
export const listPendingUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const pendingUsers = await ctx.db
      .query("users")
      .withIndex("by_approvalStatus", (q) => q.eq("approvalStatus", "pending"))
      .collect();

    return Promise.all(
      pendingUsers.map(async (user) => {
        const storageAccount = user.storageAccountId
          ? await ctx.db.get(user.storageAccountId)
          : null;

        return {
          _id: user._id,
          clerkId: user.clerkId,
          email: user.email,
          name: user.name,
          imageUrl: user.imageUrl,
          role: getEffectiveRole(user),
          hasPremium: hasPremium(user),
          approvalStatus: "pending" as const,
          storageAccountId: user.storageAccountId,
          storageAccount: storageAccount
            ? {
                _id: storageAccount._id,
                name: storageAccount.name,
                r2PathPrefix: storageAccount.r2PathPrefix,
                totalBytesUsed: storageAccount.totalBytesUsed,
                fileCount: storageAccount.fileCount,
              }
            : null,
          createdAt: user.createdAt,
        };
      })
    );
  },
});
