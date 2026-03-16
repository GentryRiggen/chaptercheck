import { v } from "convex/values";

import { type Doc, type Id } from "../_generated/dataModel";
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

    // 1. Batch-fetch all books and audio files in parallel
    const [bookResults, audioFileResults] = await Promise.all([
      Promise.all(progressRecords.map((p) => ctx.db.get(p.bookId))),
      Promise.all(progressRecords.map((p) => ctx.db.get(p.audioFileId))),
    ]);

    // Build book map for valid records
    const bookMap = new Map<string, Doc<"books">>();
    for (const book of bookResults) {
      if (book) bookMap.set(book._id, book);
    }

    const audioFileMap = new Map<string, Doc<"audioFiles">>();
    for (const af of audioFileResults) {
      if (af) audioFileMap.set(af._id, af);
    }

    // Filter to records where both book and audio file exist
    const validRecords = progressRecords.filter(
      (p) => bookMap.has(p.bookId) && audioFileMap.has(p.audioFileId)
    );

    // 2. Collect unique bookIds from valid records
    const uniqueBookIds = [...new Set(validRecords.map((p) => p.bookId))];

    // 3. Batch-fetch bookAuthors and all audio parts per book in parallel
    const [bookAuthorsByBook, allPartsByBook] = await Promise.all([
      Promise.all(
        uniqueBookIds.map((bookId) =>
          ctx.db
            .query("bookAuthors")
            .withIndex("by_book", (q) => q.eq("bookId", bookId))
            .collect()
        )
      ),
      Promise.all(
        uniqueBookIds.map((bookId) =>
          ctx.db
            .query("audioFiles")
            .withIndex("by_book", (q) => q.eq("bookId", bookId))
            .collect()
        )
      ),
    ]);

    const bookAuthorsMap = new Map<string, Doc<"bookAuthors">[]>();
    const allPartsMap = new Map<string, Doc<"audioFiles">[]>();
    for (let i = 0; i < uniqueBookIds.length; i++) {
      bookAuthorsMap.set(uniqueBookIds[i], bookAuthorsByBook[i]);
      allPartsMap.set(uniqueBookIds[i], allPartsByBook[i]);
    }

    // 4. Collect unique author IDs and series IDs, then batch-fetch
    const authorIds = new Set<Id<"authors">>();
    const seriesIds = new Set<Id<"series">>();
    for (const bas of bookAuthorsByBook) {
      for (const ba of bas) {
        authorIds.add(ba.authorId);
      }
    }
    for (const bookId of uniqueBookIds) {
      const book = bookMap.get(bookId);
      if (book?.seriesId) seriesIds.add(book.seriesId);
    }

    const [authorDocs, seriesDocs] = await Promise.all([
      Promise.all([...authorIds].map((id) => ctx.db.get(id))),
      Promise.all([...seriesIds].map((id) => ctx.db.get(id))),
    ]);

    const authorMap = new Map<string, Doc<"authors">>();
    for (const doc of authorDocs) {
      if (doc) authorMap.set(doc._id, doc);
    }
    const seriesMap = new Map<string, Doc<"series">>();
    for (const doc of seriesDocs) {
      if (doc) seriesMap.set(doc._id, doc);
    }

    // 5. Assemble results (book/audioFile guaranteed by validRecords filter above)
    return validRecords
      .map((progress) => {
        const book = bookMap.get(progress.bookId);
        const audioFile = audioFileMap.get(progress.audioFileId);
        if (!book || !audioFile) return null;
        const bas = bookAuthorsMap.get(book._id) ?? [];
        const allParts = allPartsMap.get(book._id) ?? [];

        const authors = bas
          .map((ba) => {
            const author = authorMap.get(ba.authorId);
            return author ? { _id: author._id, name: author.name } : null;
          })
          .filter((a): a is { _id: Id<"authors">; name: string } => a !== null);

        const series = book.seriesId ? (seriesMap.get(book.seriesId) ?? null) : null;

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
            authors,
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
      .filter((e) => e !== null);
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

    // Count books by status from bookUserData
    const readingBooks = await ctx.db
      .query("bookUserData")
      .withIndex("by_user_and_status", (q) => q.eq("userId", user._id).eq("status", "reading"))
      .collect();

    const finishedBooks = await ctx.db
      .query("bookUserData")
      .withIndex("by_user_and_status", (q) => q.eq("userId", user._id).eq("status", "finished"))
      .collect();

    return {
      totalListeningSeconds,
      booksInProgress: readingBooks.length,
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

    if (progressRecords.length === 0) {
      return { current: null, history: [] };
    }

    // 1. Batch-fetch all books and audio files in parallel
    const [bookResults, audioFileResults] = await Promise.all([
      Promise.all(progressRecords.map((p) => ctx.db.get(p.bookId))),
      Promise.all(progressRecords.map((p) => ctx.db.get(p.audioFileId))),
    ]);

    const bookMap = new Map<string, Doc<"books">>();
    for (const book of bookResults) {
      if (book) bookMap.set(book._id, book);
    }
    const audioFileMap = new Map<string, Doc<"audioFiles">>();
    for (const af of audioFileResults) {
      if (af) audioFileMap.set(af._id, af);
    }

    const validRecords = progressRecords.filter(
      (p) => bookMap.has(p.bookId) && audioFileMap.has(p.audioFileId)
    );

    // 2. Collect unique bookIds
    const uniqueBookIds = [...new Set(validRecords.map((p) => p.bookId))];

    // 3. Batch-fetch bookAuthors, allParts, and userBookData per book in parallel
    const [bookAuthorsByBook, allPartsByBook, userBookDataByBook] = await Promise.all([
      Promise.all(
        uniqueBookIds.map((bookId) =>
          ctx.db
            .query("bookAuthors")
            .withIndex("by_book", (q) => q.eq("bookId", bookId))
            .collect()
        )
      ),
      Promise.all(
        uniqueBookIds.map((bookId) =>
          ctx.db
            .query("audioFiles")
            .withIndex("by_book", (q) => q.eq("bookId", bookId))
            .collect()
        )
      ),
      Promise.all(
        uniqueBookIds.map((bookId) =>
          ctx.db
            .query("bookUserData")
            .withIndex("by_user_and_book", (q) => q.eq("userId", args.userId).eq("bookId", bookId))
            .unique()
        )
      ),
    ]);

    const bookAuthorsMap = new Map<string, Doc<"bookAuthors">[]>();
    const allPartsMap = new Map<string, Doc<"audioFiles">[]>();
    const userBookDataMap = new Map<string, Doc<"bookUserData"> | null>();
    for (let i = 0; i < uniqueBookIds.length; i++) {
      bookAuthorsMap.set(uniqueBookIds[i], bookAuthorsByBook[i]);
      allPartsMap.set(uniqueBookIds[i], allPartsByBook[i]);
      userBookDataMap.set(uniqueBookIds[i], userBookDataByBook[i]);
    }

    // 4. Collect unique author IDs and series IDs, then batch-fetch
    const authorIds = new Set<Id<"authors">>();
    const seriesIds = new Set<Id<"series">>();
    for (const bas of bookAuthorsByBook) {
      for (const ba of bas) {
        authorIds.add(ba.authorId);
      }
    }
    for (const bookId of uniqueBookIds) {
      const book = bookMap.get(bookId);
      if (book?.seriesId) seriesIds.add(book.seriesId);
    }

    const [authorDocs, seriesDocs] = await Promise.all([
      Promise.all([...authorIds].map((id) => ctx.db.get(id))),
      Promise.all([...seriesIds].map((id) => ctx.db.get(id))),
    ]);

    const authorMap = new Map<string, Doc<"authors">>();
    for (const doc of authorDocs) {
      if (doc) authorMap.set(doc._id, doc);
    }
    const seriesMap = new Map<string, Doc<"series">>();
    for (const doc of seriesDocs) {
      if (doc) seriesMap.set(doc._id, doc);
    }

    // 5. Assemble results (book/audioFile guaranteed by validRecords filter above)
    const history = validRecords
      .map((progress) => {
        const book = bookMap.get(progress.bookId);
        const audioFile = audioFileMap.get(progress.audioFileId);
        if (!book || !audioFile) return null;
        const bas = bookAuthorsMap.get(book._id) ?? [];
        const allParts = allPartsMap.get(book._id) ?? [];
        const userBookData = userBookDataMap.get(book._id) ?? null;

        const authors = bas
          .map((ba) => {
            const author = authorMap.get(ba.authorId);
            return author ? { _id: author._id, name: author.name } : null;
          })
          .filter((a): a is { _id: Id<"authors">; name: string } => a !== null);

        const series = book.seriesId ? (seriesMap.get(book.seriesId) ?? null) : null;

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
      .filter((item) => item !== null);

    return {
      current: history[0] ?? null,
      history,
    };
  },
});
