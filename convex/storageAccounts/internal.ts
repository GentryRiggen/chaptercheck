import { v } from "convex/values";

import { internalMutation } from "../_generated/server";

// Internal mutation to get or create a storage account (callable from actions)
export const getOrCreateStorageAccountInternal = internalMutation({
  args: {
    clerkId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by clerkId
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // Check if user already has a storage account
    if (user.storageAccountId) {
      const existingAccount = await ctx.db.get(user.storageAccountId);
      if (existingAccount) {
        return existingAccount;
      }
    }

    // Create new storage account
    const now = Date.now();

    const storageAccountId = await ctx.db.insert("storageAccounts", {
      r2PathPrefix: "", // Will be set after we have the ID
      totalBytesUsed: 0,
      fileCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Set r2PathPrefix using the storage account ID
    const r2PathPrefix = `storage-accounts/${storageAccountId}`;
    await ctx.db.patch(storageAccountId, { r2PathPrefix });

    // Assign to user
    await ctx.db.patch(user._id, {
      storageAccountId,
      updatedAt: now,
    });

    const storageAccount = await ctx.db.get(storageAccountId);
    if (!storageAccount) {
      throw new Error("Failed to create storage account");
    }
    return storageAccount;
  },
});
