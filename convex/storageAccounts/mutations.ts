import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { internalMutation, mutation } from "../_generated/server";
import { type MutationCtx } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

// Get or create a storage account for the current user
export const getOrCreateStorageAccount = mutation({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuthMutation(ctx);

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

// Internal helper to update storage account stats after file upload
export const incrementStorageStats = internalMutation({
  args: {
    storageAccountId: v.id("storageAccounts"),
    bytesAdded: v.number(),
  },
  handler: async (ctx, args) => {
    const storageAccount = await ctx.db.get(args.storageAccountId);
    if (!storageAccount) {
      throw new Error("Storage account not found");
    }

    await ctx.db.patch(args.storageAccountId, {
      totalBytesUsed: storageAccount.totalBytesUsed + args.bytesAdded,
      fileCount: storageAccount.fileCount + 1,
      updatedAt: Date.now(),
    });
  },
});

// Internal helper to update storage account stats after file deletion
export const decrementStorageStats = internalMutation({
  args: {
    storageAccountId: v.id("storageAccounts"),
    bytesRemoved: v.number(),
  },
  handler: async (ctx, args) => {
    const storageAccount = await ctx.db.get(args.storageAccountId);
    if (!storageAccount) {
      throw new Error("Storage account not found");
    }

    await ctx.db.patch(args.storageAccountId, {
      totalBytesUsed: Math.max(0, storageAccount.totalBytesUsed - args.bytesRemoved),
      fileCount: Math.max(0, storageAccount.fileCount - 1),
      updatedAt: Date.now(),
    });
  },
});

// Helper function to update storage stats (for use in other mutations)
export async function updateStorageStatsOnInsert(
  ctx: MutationCtx,
  storageAccountId: Id<"storageAccounts">,
  fileSize: number
) {
  const storageAccount = await ctx.db.get(storageAccountId);
  if (!storageAccount) {
    throw new Error("Storage account not found");
  }

  await ctx.db.patch(storageAccountId, {
    totalBytesUsed: storageAccount.totalBytesUsed + fileSize,
    fileCount: storageAccount.fileCount + 1,
    updatedAt: Date.now(),
  });
}

export async function updateStorageStatsOnDelete(
  ctx: MutationCtx,
  storageAccountId: Id<"storageAccounts">,
  fileSize: number
) {
  const storageAccount = await ctx.db.get(storageAccountId);
  if (!storageAccount) {
    throw new Error("Storage account not found");
  }

  await ctx.db.patch(storageAccountId, {
    totalBytesUsed: Math.max(0, storageAccount.totalBytesUsed - fileSize),
    fileCount: Math.max(0, storageAccount.fileCount - 1),
    updatedAt: Date.now(),
  });
}
