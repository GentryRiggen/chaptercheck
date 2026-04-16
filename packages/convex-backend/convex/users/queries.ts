import { v } from "convex/values";

import { query } from "../_generated/server";
import { getBlockedUserIdsForUser } from "../blocks/helpers";
import {
  getCurrentUser,
  getEffectiveRole,
  hasPremium,
  hasRoleLevel,
  isApprovedUser,
  isSuspendedUser,
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
  isSuspended: boolean;

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
  canSendMessages: boolean; // Requires messagingEnabled + allowDirectMessages + approved
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
    const suspended = isSuspendedUser(user);

    const isAdmin = hasRoleLevel(user, "admin");
    const isEditor = hasRoleLevel(user, "editor");

    const permissions: UserPermissions = {
      // Role checks
      isAdmin,
      isEditor,
      isViewer: true, // All authenticated users are at least viewers

      // Approval checks
      isPending: !approved && !suspended,
      isApproved: approved,
      isSuspended: suspended,

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
      canSendMessages:
        approved && (user.messagingEnabled ?? false) && (user.allowDirectMessages ?? false),
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
      messagingEnabled: user.messagingEnabled ?? false,
      allowDirectMessages: user.allowDirectMessages ?? false,
      approvalStatus: user.approvalStatus ?? "approved",
      suspensionReason: suspended ? user.suspensionReason : undefined,
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

    // Check block status (only for non-own profiles)
    let isBlockedByMe = false;
    let isBlockedByThem = false;
    if (!isOwnProfile) {
      const [blockedByMe, blockedByThem] = await Promise.all([
        ctx.db
          .query("blocks")
          .withIndex("by_blocker_and_blocked", (q) =>
            q.eq("blockerId", currentUser._id).eq("blockedUserId", args.userId)
          )
          .unique(),
        ctx.db
          .query("blocks")
          .withIndex("by_blocker_and_blocked", (q) =>
            q.eq("blockerId", args.userId).eq("blockedUserId", currentUser._id)
          )
          .unique(),
      ]);
      isBlockedByMe = blockedByMe !== null;
      isBlockedByThem = blockedByThem !== null;
    }

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
      isBlockedByMe,
      isBlockedByThem,
      followersCount,
      followingCount,
      isFollowedByMe,
    };

    // If blocked by the profile owner, return minimal info (like a private profile)
    if (isBlockedByThem) {
      return {
        ...basicInfo,
        stats: null,
      };
    }

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
      messagingEnabled: targetUser.messagingEnabled ?? false,
      approvalStatus: targetUser.approvalStatus ?? "approved",
      suspensionReason: targetUser.suspensionReason,
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
    const blockedIds = await getBlockedUserIdsForUser(ctx, user._id);

    const trimmed = args.query.trim();
    if (!trimmed) return [];

    const results = await ctx.db
      .query("users")
      .withSearchIndex("search_users", (q) => q.search("name", trimmed))
      .take(20);

    return results
      .filter((u) => u._id !== user._id && !blockedIds.has(u._id))
      .map((u) => ({
        _id: u._id,
        name: u.name,
        imageUrl: u.imageUrl,
      }));
  },
});

/**
 * Get user counts grouped by approval status (admin-only).
 * Used for tab badges on the admin users page.
 */
export const getUserStatusCounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const users = await ctx.db.query("users").collect();

    let total = 0;
    let active = 0;
    let pending = 0;
    let suspended = 0;

    for (const user of users) {
      total++;
      const status = user.approvalStatus ?? "approved";
      if (status === "approved") active++;
      else if (status === "pending") pending++;
      else if (status === "suspended") suspended++;
    }

    return { total, active, pending, suspended };
  },
});

/**
 * Search and filter users with optional text search, status, and role filters (admin-only).
 * Replaces the need for separate listAllUsers + listPendingUsers on the admin page.
 */
export const searchAndFilterUsers = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(
      v.union(v.literal("active"), v.literal("pending"), v.literal("suspended"), v.literal("all"))
    ),
    role: v.optional(
      v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer"), v.literal("all"))
    ),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const search = args.search?.trim();
    const statusFilter = args.status ?? "all";
    const roleFilter = args.role ?? "all";

    // Fetch users: use search index if search term provided, otherwise full scan
    let users;
    if (search) {
      users = await ctx.db
        .query("users")
        .withSearchIndex("search_users", (q) => q.search("name", search))
        .collect();
    } else {
      users = await ctx.db.query("users").collect();
    }

    // Apply status filter
    if (statusFilter !== "all") {
      users = users.filter((user) => {
        const effectiveStatus = user.approvalStatus ?? "approved";
        if (statusFilter === "active") return effectiveStatus === "approved";
        return effectiveStatus === statusFilter;
      });
    }

    // Apply role filter
    if (roleFilter !== "all") {
      users = users.filter((user) => getEffectiveRole(user) === roleFilter);
    }

    // Enrich with storage account info (same shape as listAllUsers)
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
          messagingEnabled: user.messagingEnabled ?? false,
          approvalStatus: user.approvalStatus ?? "approved",
          suspensionReason: user.suspensionReason,
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
 * Get a summary of all data that would be deleted for a user (admin-only).
 * Used by the admin delete-user confirmation dialog.
 */
export const getAdminUserDeletionSummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const targetUser = await ctx.db.get(args.userId);
    if (!targetUser) {
      return null;
    }

    // Fetch all data in parallel
    const [
      bookUserData,
      shelves,
      bookNotes,
      noteCategories,
      memoryTags,
      bookNoteTags,
      listeningProgress,
      audioFiles,
      bookGenreVotes,
      followsAsFollower,
      followsAsFollowing,
      userPreferences,
    ] = await Promise.all([
      ctx.db
        .query("bookUserData")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("shelves")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("bookNotes")
        .withIndex("by_user_and_book", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("noteCategories")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("memoryTags")
        .withIndex("by_user", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("bookNoteTags")
        .withIndex("by_user_and_tag", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("listeningProgress")
        .withIndex("by_user_and_book", (q) => q.eq("userId", args.userId))
        .collect(),
      ctx.db
        .query("audioFiles")
        .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", args.userId))
        .collect(),
      ctx.db
        .query("bookGenreVotes")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_follower", (q) => q.eq("followerId", args.userId))
        .collect(),
      ctx.db
        .query("follows")
        .withIndex("by_following", (q) => q.eq("followingId", args.userId))
        .collect(),
      ctx.db
        .query("userPreferences")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect(),
    ]);

    // Count shelfBooks across all shelves
    let totalShelfBooks = 0;
    for (const shelf of shelves) {
      const shelfBooks = await ctx.db
        .query("shelfBooks")
        .withIndex("by_shelf", (q) => q.eq("shelfId", shelf._id))
        .collect();
      totalShelfBooks += shelfBooks.length;
    }

    // Compute audio file stats
    const totalAudioBytes = audioFiles.reduce((sum, f) => sum + f.fileSize, 0);
    const distinctBooksWithAudio = new Set(audioFiles.map((f) => f.bookId)).size;

    // Compute bookUserData breakdowns
    const ratingsCount = bookUserData.filter((d) => d.rating !== undefined).length;
    const reviewsCount = bookUserData.filter(
      (d) => d.reviewText !== undefined && d.reviewText !== ""
    ).length;

    // Storage account info
    let storageAccountInfo = null;
    if (targetUser.storageAccountId) {
      const storageAccount = await ctx.db.get(targetUser.storageAccountId);
      if (storageAccount) {
        const usersOnAccount = await ctx.db
          .query("users")
          .withIndex("by_storageAccountId", (q) =>
            q.eq("storageAccountId", targetUser.storageAccountId!)
          )
          .collect();

        storageAccountInfo = {
          isSoleUser: usersOnAccount.length === 1,
          accountName: storageAccount.name,
          storageAccountId: storageAccount._id,
        };
      }
    }

    return {
      user: {
        _id: targetUser._id,
        name: targetUser.name,
        email: targetUser.email,
      },
      counts: {
        totalBookEntries: bookUserData.length,
        ratingsCount,
        reviewsCount,
        shelvesCount: shelves.length,
        totalShelfBooks,
        bookNotesCount: bookNotes.length,
        noteCategoriesCount: noteCategories.length,
        memoryTagsCount: memoryTags.length,
        bookNoteTagsCount: bookNoteTags.length,
        listeningProgressCount: listeningProgress.length,
        audioFilesCount: audioFiles.length,
        totalAudioBytes,
        distinctBooksWithAudio,
        bookGenreVotesCount: bookGenreVotes.length,
        followsAsFollowerCount: followsAsFollower.length,
        followsAsFollowingCount: followsAsFollowing.length,
        hasUserPreferences: userPreferences.length > 0,
      },
      storageAccount: storageAccountInfo,
    };
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
