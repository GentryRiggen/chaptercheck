import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

// Create audio file metadata after successful upload to R2
export const createAudioFile = mutation({
  args: {
    bookId: v.id("books"),
    fileName: v.string(),
    fileSize: v.number(),
    duration: v.number(),
    format: v.string(),
    r2Key: v.string(),
    r2Bucket: v.string(),
    chapterNumber: v.optional(v.number()),
    chapterTitle: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    const now = Date.now();

    const audioFileId = await ctx.db.insert("audioFiles", {
      bookId: args.bookId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      duration: args.duration,
      format: args.format,
      r2Key: args.r2Key,
      r2Bucket: args.r2Bucket,
      chapterNumber: args.chapterNumber,
      chapterTitle: args.chapterTitle,
      uploadedBy: user._id,
      uploadedAt: now,
    });

    return audioFileId;
  },
});

// Delete an audio file (metadata only - file stays in R2 for now)
export const deleteAudioFile = mutation({
  args: { audioFileId: v.id("audioFiles") },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);

    await ctx.db.delete(args.audioFileId);
    return { success: true };
  },
});
