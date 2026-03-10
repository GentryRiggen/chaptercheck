import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

/**
 * Save or update listening progress for a book.
 * Upserts by (userId, bookId) — one row per user per book.
 */
export const saveProgress = mutation({
  args: {
    bookId: v.id("books"),
    audioFileId: v.id("audioFiles"),
    positionSeconds: v.number(),
    playbackRate: v.number(),
    audioDuration: v.optional(v.number()),
    clientTimestamp: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const now = Date.now();
    const clientTimestamp = args.clientTimestamp ?? now;

    // Verify audioFile belongs to the specified book
    const audioFile = await ctx.db.get(args.audioFileId);
    if (!audioFile || audioFile.bookId !== args.bookId) {
      throw new Error("Audio file does not belong to the specified book");
    }

    // Backfill audio file duration when the stored value is 0 but the
    // player reports a real duration (metadata wasn't available at upload).
    if (audioFile.duration === 0 && args.audioDuration && args.audioDuration > 0) {
      await ctx.db.patch(audioFile._id, { duration: args.audioDuration });
    }

    const existing = await ctx.db
      .query("listeningProgress")
      .withIndex("by_user_and_book", (q) => q.eq("userId", user._id).eq("bookId", args.bookId))
      .unique();

    if (existing) {
      if (clientTimestamp < existing.lastListenedAt) {
        return existing._id;
      }

      await ctx.db.patch(existing._id, {
        audioFileId: args.audioFileId,
        positionSeconds: args.positionSeconds,
        playbackRate: args.playbackRate,
        lastListenedAt: clientTimestamp,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("listeningProgress", {
      userId: user._id,
      bookId: args.bookId,
      audioFileId: args.audioFileId,
      positionSeconds: args.positionSeconds,
      playbackRate: args.playbackRate,
      lastListenedAt: clientTimestamp,
      createdAt: now,
      updatedAt: now,
    });
  },
});
