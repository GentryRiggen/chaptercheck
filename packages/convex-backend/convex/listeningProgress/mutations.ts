import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

/**
 * Save or update listening progress for a book.
 * Upserts by (userId, bookId) — one row per user per book.
 * Also auto-sets the book's reading status to "reading" if it has no status
 * or is in "want_to_read", so the "In Progress" stat stays accurate.
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

      // Reject position regression on the same audio file.
      // The > 5 threshold allows explicit restarts (position ~0) while
      // blocking accidental regression from stale reconnection data.
      if (
        args.audioFileId === existing.audioFileId &&
        args.positionSeconds < existing.positionSeconds &&
        args.positionSeconds > 5
      ) {
        return existing._id;
      }

      await ctx.db.patch(existing._id, {
        audioFileId: args.audioFileId,
        positionSeconds: args.positionSeconds,
        playbackRate: args.playbackRate,
        lastListenedAt: clientTimestamp,
        updatedAt: now,
      });

      // Auto-set "reading" status on first progress save for this book
      await autoSetReadingStatus(ctx, user._id, args.bookId, now);

      return existing._id;
    }

    const id = await ctx.db.insert("listeningProgress", {
      userId: user._id,
      bookId: args.bookId,
      audioFileId: args.audioFileId,
      positionSeconds: args.positionSeconds,
      playbackRate: args.playbackRate,
      lastListenedAt: clientTimestamp,
      createdAt: now,
      updatedAt: now,
    });

    // Auto-set "reading" status on first progress save for this book
    await autoSetReadingStatus(ctx, user._id, args.bookId, now);

    return id;
  },
});

/**
 * Auto-set a book to "reading" status when the user starts listening.
 * Only transitions from no-status or "want_to_read". Doesn't override
 * explicit statuses like "finished", "paused", or "dnf".
 */
async function autoSetReadingStatus(
  ctx: MutationCtx,
  userId: Id<"users">,
  bookId: Id<"books">,
  now: number
) {
  const bookUserData = await ctx.db
    .query("bookUserData")
    .withIndex("by_user_and_book", (q) => q.eq("userId", userId).eq("bookId", bookId))
    .unique();

  if (bookUserData) {
    // Only auto-transition if no explicit status or "want_to_read"
    const status = bookUserData.status;
    if (status && status !== "want_to_read") return;

    await ctx.db.patch(bookUserData._id, {
      status: "reading",
      startedAt: bookUserData.startedAt ?? now,
      lastStatusChangedAt: now,
      isRead: false,
      updatedAt: now,
    });
  } else {
    // Create bookUserData with "reading" status
    await ctx.db.insert("bookUserData", {
      userId,
      bookId,
      status: "reading",
      startedAt: now,
      lastStatusChangedAt: now,
      isRead: false,
      isReadPrivate: false,
      isReviewPrivate: false,
      createdAt: now,
      updatedAt: now,
    });
  }
}
