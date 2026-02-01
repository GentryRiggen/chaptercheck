import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

// Get a single audio file by ID (only if it belongs to the current user's storage account)
export const getAudioFile = query({
  args: { audioFileId: v.id("audioFiles") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const audioFile = await ctx.db.get(args.audioFileId);
    if (!audioFile) {
      return null;
    }

    // For files with storageAccountId, verify user has access to that storage account
    if (audioFile.storageAccountId) {
      if (user.storageAccountId !== audioFile.storageAccountId) {
        return null;
      }
    } else {
      // Legacy files without storageAccountId - check uploadedBy
      if (audioFile.uploadedBy !== user._id) {
        return null;
      }
    }

    return audioFile;
  },
});

// Get all audio files for a book (filtered to current user's storage account)
export const getAudioFilesForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    if (user.storageAccountId) {
      // Query using the efficient composite index
      const audioFiles = await ctx.db
        .query("audioFiles")
        .withIndex("by_storageAccount_and_book", (q) =>
          q.eq("storageAccountId", user.storageAccountId).eq("bookId", args.bookId)
        )
        .order("asc")
        .collect();

      return audioFiles;
    }

    // Fallback for users without storage account - check legacy files by uploadedBy
    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .order("asc")
      .collect();

    // Filter to only return files uploaded by this user
    return audioFiles.filter((file) => file.uploadedBy === user._id);
  },
});

// Get all audio files for the current user (across all books)
export const getMyAudioFiles = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    if (user.storageAccountId) {
      return await ctx.db
        .query("audioFiles")
        .withIndex("by_storageAccount", (q) => q.eq("storageAccountId", user.storageAccountId))
        .order("desc")
        .collect();
    }

    // Fallback for users without storage account
    return await ctx.db
      .query("audioFiles")
      .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", user._id))
      .order("desc")
      .collect();
  },
});
