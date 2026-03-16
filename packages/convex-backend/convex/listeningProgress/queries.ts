import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAdmin, requireAuth } from "../lib/auth";

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

        // Use audio file duration for per-part progress. When the file
        // duration is 0 (metadata not extracted), fall back to book duration,
        // then to the sum of all part durations.
        const totalPartsDuration = allParts.reduce((sum, p) => sum + p.duration, 0);
        const effectiveDuration =
          audioFile.duration > 0
            ? audioFile.duration
            : allParts.length === 1 && (book.duration ?? 0) > 0
              ? book.duration!
              : totalPartsDuration > 0
                ? totalPartsDuration
                : 0;
        const progressFraction =
          effectiveDuration > 0 ? progress.positionSeconds / effectiveDuration : 0;

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

/**
 * Lightweight stats for the home screen: total listening time,
 * books in progress, and books finished.
 */
export const getListeningStats = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const progressRecords = await ctx.db
      .query("listeningProgress")
      .withIndex("by_user_and_lastListened", (q) => q.eq("userId", user._id))
      .collect();

    // Sum position across all books as an approximation of total listening time
    let totalListeningSeconds = 0;
    for (const p of progressRecords) {
      totalListeningSeconds += p.positionSeconds;
    }

    const finishedBooks = await ctx.db
      .query("bookUserData")
      .withIndex("by_user_and_status", (q) => q.eq("userId", user._id).eq("status", "finished"))
      .collect();

    return {
      totalListeningSeconds,
      booksInProgress: progressRecords.length,
      booksFinished: finishedBooks.length,
    };
  },
});

/**
 * Get a user's listening activity for the admin drill-in page.
 * Returns their most recently synced listening state plus recent history.
 */
export const getAdminUserListeningActivity = query({
  args: {
    userId: v.id("users"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) {
      return null;
    }

    const limit = args.limit ?? 20;
    const progressRecords = await ctx.db
      .query("listeningProgress")
      .withIndex("by_user_and_lastListened", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    const history = (
      await Promise.all(
        progressRecords.map(async (progress) => {
          const book = await ctx.db.get(progress.bookId);
          if (!book) return null;

          const audioFile = await ctx.db.get(progress.audioFileId);
          if (!audioFile) return null;

          const [bookAuthors, series, allParts, userBookData] = await Promise.all([
            ctx.db
              .query("bookAuthors")
              .withIndex("by_book", (q) => q.eq("bookId", book._id))
              .collect(),
            book.seriesId ? ctx.db.get(book.seriesId) : Promise.resolve(null),
            ctx.db
              .query("audioFiles")
              .withIndex("by_book", (q) => q.eq("bookId", book._id))
              .collect(),
            ctx.db
              .query("bookUserData")
              .withIndex("by_user_and_book", (q) =>
                q.eq("userId", args.userId).eq("bookId", book._id)
              )
              .unique(),
          ]);

          const authors = (
            await Promise.all(
              bookAuthors.map(async (ba) => {
                const author = await ctx.db.get(ba.authorId);
                return author ? { _id: author._id, name: author.name } : null;
              })
            )
          ).filter(
            (author): author is { _id: (typeof bookAuthors)[number]["authorId"]; name: string } =>
              author !== null
          );

          const totalPartsDuration = allParts.reduce((sum, part) => sum + part.duration, 0);
          const effectiveDuration =
            audioFile.duration > 0
              ? audioFile.duration
              : allParts.length === 1 && (book.duration ?? 0) > 0
                ? book.duration!
                : totalPartsDuration > 0
                  ? totalPartsDuration
                  : 0;
          const progressFraction =
            effectiveDuration > 0 ? progress.positionSeconds / effectiveDuration : 0;

          return {
            _id: progress._id,
            bookId: book._id,
            book: {
              title: book.title,
              coverImageR2Key: book.coverImageR2Key,
              seriesOrder: book.seriesOrder,
              duration: book.duration,
              authors,
              series: series ? { _id: series._id, name: series.name } : null,
            },
            audioFile: {
              _id: audioFile._id,
              partNumber: audioFile.partNumber,
              duration: audioFile.duration,
              chapterNumber: audioFile.chapterNumber,
              displayName: audioFile.chapterTitle || audioFile.fileName,
            },
            userBookData: userBookData
              ? {
                  status: userBookData.isRead ? "read" : undefined,
                  rating: userBookData.rating,
                  reviewText: userBookData.reviewText,
                }
              : null,
            positionSeconds: progress.positionSeconds,
            effectiveDuration,
            playbackRate: progress.playbackRate,
            progressFraction: Math.min(progressFraction, 1),
            totalParts: allParts.length,
            lastListenedAt: progress.lastListenedAt,
            updatedAt: progress.updatedAt,
          };
        })
      )
    ).filter((item) => item !== null);

    return {
      current: history[0] ?? null,
      history,
    };
  },
});
