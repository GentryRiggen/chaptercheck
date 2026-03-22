import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
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

/**
 * Internal mutation to empty a storage account's data from the database.
 *
 * Deletes all audioFile records for the account, related listeningProgress
 * records for affected users/books, and resets storage stats to 0.
 */
export const emptyStorageAccountData = internalMutation({
  args: {
    storageAccountId: v.id("storageAccounts"),
    audioFileIds: v.array(v.id("audioFiles")),
    bookIds: v.array(v.id("books")),
    userIds: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    let audioFilesDeleted = 0;
    let listeningProgressDeleted = 0;

    // Delete all audioFile records
    for (const audioFileId of args.audioFileIds) {
      const audioFile = await ctx.db.get(audioFileId);
      if (audioFile) {
        await ctx.db.delete(audioFileId);
        audioFilesDeleted++;
      }
    }

    // Delete listeningProgress for users on this account for books that had audio
    // A user's listening progress references an audioFileId that no longer exists,
    // so it must be cleaned up.
    for (const userId of args.userIds) {
      for (const bookId of args.bookIds as Id<"books">[]) {
        const progress = await ctx.db
          .query("listeningProgress")
          .withIndex("by_user_and_book", (q) => q.eq("userId", userId).eq("bookId", bookId))
          .collect();
        for (const row of progress) {
          await ctx.db.delete(row._id);
          listeningProgressDeleted++;
        }
      }
    }

    // Reset storage account stats
    const storageAccount = await ctx.db.get(args.storageAccountId);
    if (storageAccount) {
      await ctx.db.patch(args.storageAccountId, {
        totalBytesUsed: 0,
        fileCount: 0,
        updatedAt: Date.now(),
      });
    }

    return { audioFilesDeleted, listeningProgressDeleted };
  },
});
