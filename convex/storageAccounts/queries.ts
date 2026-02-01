import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

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
