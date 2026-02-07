import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { hasPremium, requireEditorMutation } from "../lib/auth";
import {
  updateStorageStatsOnDelete,
  updateStorageStatsOnInsert,
} from "../storageAccounts/mutations";

// Create audio file metadata after successful upload to R2
// Requires editor role and premium access
export const createAudioFile = mutation({
  args: {
    bookId: v.id("books"),
    fileName: v.string(),
    fileSize: v.number(),
    duration: v.number(),
    format: v.string(),
    r2Key: v.string(),
    r2Bucket: v.string(),
    storageAccountId: v.id("storageAccounts"),
    partNumber: v.number(),
    chapterNumber: v.optional(v.number()),
    chapterTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireEditorMutation(ctx);

    // Premium check for audio uploads
    if (!hasPremium(user)) {
      throw new Error("Premium access required to upload audio files");
    }

    // Verify the user has access to this storage account
    if (user.storageAccountId !== args.storageAccountId) {
      throw new Error("Invalid storage account");
    }

    const storageAccount = await ctx.db.get(args.storageAccountId);
    if (!storageAccount) {
      throw new Error("Storage account not found");
    }

    const now = Date.now();

    const audioFileId = await ctx.db.insert("audioFiles", {
      bookId: args.bookId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      duration: args.duration,
      format: args.format,
      r2Key: args.r2Key,
      r2Bucket: args.r2Bucket,
      storageAccountId: args.storageAccountId,
      partNumber: args.partNumber,
      chapterNumber: args.chapterNumber,
      chapterTitle: args.chapterTitle,
      uploadedBy: user._id,
      uploadedAt: now,
    });

    // Update storage account stats
    await updateStorageStatsOnInsert(ctx, args.storageAccountId, args.fileSize);

    return audioFileId;
  },
});

// Reorder audio files for a book
// Requires editor role
export const reorderAudioFiles = mutation({
  args: {
    bookId: v.id("books"),
    // Array of audio file IDs in the new order
    orderedFileIds: v.array(v.id("audioFiles")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireEditorMutation(ctx);

    // Verify access to all files and update their part numbers
    for (let i = 0; i < args.orderedFileIds.length; i++) {
      const fileId = args.orderedFileIds[i];
      const audioFile = await ctx.db.get(fileId);

      if (!audioFile) {
        throw new Error(`Audio file not found: ${fileId}`);
      }

      // Verify the file belongs to this book
      if (audioFile.bookId !== args.bookId) {
        throw new Error("Audio file does not belong to this book");
      }

      // Verify user has access
      if (audioFile.storageAccountId) {
        if (user.storageAccountId !== audioFile.storageAccountId) {
          throw new Error("Not authorized to reorder this file");
        }
      } else if (audioFile.uploadedBy !== user._id) {
        throw new Error("Not authorized to reorder this file");
      }

      // Update the part number (1-based)
      await ctx.db.patch(fileId, {
        partNumber: i + 1,
      });
    }

    return { success: true };
  },
});

// Delete an audio file (metadata only - file stays in R2 for now)
// Requires editor role
export const deleteAudioFile = mutation({
  args: { audioFileId: v.id("audioFiles") },
  handler: async (ctx, args) => {
    const { user } = await requireEditorMutation(ctx);

    const audioFile = await ctx.db.get(args.audioFileId);
    if (!audioFile) {
      throw new Error("Audio file not found");
    }

    // Verify the user has access to this file
    if (audioFile.storageAccountId) {
      // Check user has access to the storage account
      if (user.storageAccountId !== audioFile.storageAccountId) {
        throw new Error("Not authorized to delete this file");
      }
    } else {
      // Legacy files without storageAccountId - check uploadedBy
      if (audioFile.uploadedBy !== user._id) {
        throw new Error("Not authorized to delete this file");
      }
    }

    // Update storage account stats if storageAccountId exists
    if (audioFile.storageAccountId) {
      await updateStorageStatsOnDelete(ctx, audioFile.storageAccountId, audioFile.fileSize);
    }

    await ctx.db.delete(args.audioFileId);
    return { success: true };
  },
});
