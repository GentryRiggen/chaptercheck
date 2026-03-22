import { v } from "convex/values";

import { internalQuery, query } from "../_generated/server";
import { requireAdmin, requireAuth } from "../lib/auth";

// Get the current user's storage account
export const getMyStorageAccount = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    if (!user.storageAccountId) {
      return null;
    }

    return await ctx.db.get(user.storageAccountId);
  },
});

// Get storage stats for the current user
export const getStorageStats = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    if (!user.storageAccountId) {
      return {
        totalBytesUsed: 0,
        fileCount: 0,
        hasStorageAccount: false,
      };
    }

    const storageAccount = await ctx.db.get(user.storageAccountId);

    if (!storageAccount) {
      return {
        totalBytesUsed: 0,
        fileCount: 0,
        hasStorageAccount: false,
      };
    }

    return {
      totalBytesUsed: storageAccount.totalBytesUsed,
      fileCount: storageAccount.fileCount,
      hasStorageAccount: true,
    };
  },
});

// List all storage accounts with owner info (admin-only)
export const listAllStorageAccounts = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);

    const accounts = await ctx.db.query("storageAccounts").collect();

    const accountsWithUsers = await Promise.all(
      accounts.map(async (account) => {
        const users = await ctx.db
          .query("users")
          .withIndex("by_storageAccountId", (q) => q.eq("storageAccountId", account._id))
          .collect();

        return {
          _id: account._id,
          name: account.name,
          r2PathPrefix: account.r2PathPrefix,
          totalBytesUsed: account.totalBytesUsed,
          fileCount: account.fileCount,
          users: users.map((u) => ({ _id: u._id, name: u.name, email: u.email })),
        };
      })
    );

    return accountsWithUsers;
  },
});

// Get all users sharing a storage account
export const getStorageAccountUsers = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    if (!user.storageAccountId) {
      return [];
    }

    const users = await ctx.db
      .query("users")
      .withIndex("by_storageAccountId", (q) => q.eq("storageAccountId", user.storageAccountId))
      .collect();

    return users.map((u) => ({
      _id: u._id,
      name: u.name,
      email: u.email,
      imageUrl: u.imageUrl,
    }));
  },
});

/**
 * Get a summary of what would be affected by emptying a storage account (admin-only).
 * Used by the admin confirmation dialog before emptying.
 */
export const getStorageAccountEmptySummary = query({
  args: { storageAccountId: v.id("storageAccounts") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const storageAccount = await ctx.db.get(args.storageAccountId);
    if (!storageAccount) {
      return null;
    }

    // Get all audio files in this storage account
    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_storageAccount", (q) => q.eq("storageAccountId", args.storageAccountId))
      .collect();

    const totalBytes = audioFiles.reduce((sum, f) => sum + f.fileSize, 0);
    const distinctBooks = new Set(audioFiles.map((f) => f.bookId)).size;

    // Get assigned users
    const users = await ctx.db
      .query("users")
      .withIndex("by_storageAccountId", (q) => q.eq("storageAccountId", args.storageAccountId))
      .collect();

    return {
      storageAccountId: storageAccount._id,
      name: storageAccount.name,
      r2PathPrefix: storageAccount.r2PathPrefix,
      audioFilesCount: audioFiles.length,
      totalBytes,
      distinctBooksCount: distinctBooks,
      assignedUsersCount: users.length,
      assignedUsers: users.map((u) => ({ _id: u._id, name: u.name, email: u.email })),
    };
  },
});

/**
 * Internal query to get storage account details and audio files for the empty action.
 */
export const getStorageAccountForEmpty = internalQuery({
  args: { storageAccountId: v.id("storageAccounts") },
  handler: async (ctx, args) => {
    const storageAccount = await ctx.db.get(args.storageAccountId);
    if (!storageAccount) {
      throw new Error("Storage account not found");
    }

    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_storageAccount", (q) => q.eq("storageAccountId", args.storageAccountId))
      .collect();

    // Get book IDs that have audio in this account (for listening progress cleanup)
    const bookIds = [...new Set(audioFiles.map((f) => f.bookId))];

    // Get users assigned to this storage account
    const users = await ctx.db
      .query("users")
      .withIndex("by_storageAccountId", (q) => q.eq("storageAccountId", args.storageAccountId))
      .collect();

    return {
      storageAccount,
      audioFileIds: audioFiles.map((f) => f._id),
      bookIds,
      userIds: users.map((u) => u._id),
      totalBytes: audioFiles.reduce((sum, f) => sum + f.fileSize, 0),
    };
  },
});
