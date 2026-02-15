import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Get listening progress for a specific book (current user).
 * Returns null if no progress saved.
 */
export const getProgressForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    return await ctx.db
      .query("listeningProgress")
      .withIndex("by_user_and_book", (q) => q.eq("userId", user._id).eq("bookId", args.bookId))
      .unique();
  },
});

/**
 * Get recently listened books for the current user, enriched with
 * book details (title, cover, authors, series) and audio file info.
 */
export const getRecentlyListening = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);
    const limit = args.limit ?? 6;

    const progressRecords = await ctx.db
      .query("listeningProgress")
      .withIndex("by_user_and_lastListened", (q) => q.eq("userId", user._id))
      .order("desc")
      .take(limit);

    if (progressRecords.length === 0) return [];

    const enriched = await Promise.all(
      progressRecords.map(async (progress) => {
        const book = await ctx.db.get(progress.bookId);
        if (!book) return null;

        const audioFile = await ctx.db.get(progress.audioFileId);
        if (!audioFile) return null;

        // Enrich with authors
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const authors = await Promise.all(
          bookAuthors.map(async (ba) => {
            const author = await ctx.db.get(ba.authorId);
            return author ? { _id: author._id, name: author.name } : null;
          })
        );

        const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

        // Count total parts for this book
        const allParts = await ctx.db
          .query("audioFiles")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const progressFraction =
          audioFile.duration > 0 ? progress.positionSeconds / audioFile.duration : 0;

        return {
          _id: progress._id,
          bookId: book._id,
          book: {
            title: book.title,
            coverImageR2Key: book.coverImageR2Key,
            seriesOrder: book.seriesOrder,
            authors: authors.filter((a) => a !== null),
            series: series ? { _id: series._id, name: series.name } : null,
          },
          audioFile: {
            _id: audioFile._id,
            partNumber: audioFile.partNumber,
            duration: audioFile.duration,
            displayName: audioFile.chapterTitle || audioFile.fileName,
          },
          positionSeconds: progress.positionSeconds,
          playbackRate: progress.playbackRate,
          progressFraction: Math.min(progressFraction, 1),
          totalParts: allParts.length,
          lastListenedAt: progress.lastListenedAt,
        };
      })
    );

    return enriched.filter((e) => e !== null);
  },
});
