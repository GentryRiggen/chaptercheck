import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { batchEnrichBooks } from "../lib/enrichment";

// Get a single series by ID
export const getSeries = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    return await ctx.db.get(args.seriesId);
  },
});

// Search series by name
export const searchSeries = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    if (!args.searchTerm || args.searchTerm.trim().length === 0) {
      return [];
    }

    const results = await ctx.db
      .query("series")
      .withSearchIndex("search_series", (q) => q.search("name", args.searchTerm))
      .take(20);

    return results;
  },
});

// Get all series (for dropdown/selection)
export const listSeries = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("series").order("desc").take(100);
  },
});

// List all series with preview data (book count, covers, authors)
export const listSeriesWithPreviews = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    const allSeries = await ctx.db.query("series").order("desc").take(100);

    // 1. Fetch books for ALL series in parallel
    const booksBySeries = await Promise.all(
      allSeries.map((series) =>
        ctx.db
          .query("books")
          .withIndex("by_series_and_order", (q) => q.eq("seriesId", series._id))
          .collect()
      )
    );

    // Sort each series' books by seriesOrder (nulls last)
    for (const books of booksBySeries) {
      books.sort((a, b) => {
        if (a.seriesOrder === undefined) return 1;
        if (b.seriesOrder === undefined) return -1;
        return a.seriesOrder - b.seriesOrder;
      });
    }

    // 2. Collect all unique book IDs across all series
    const allBookIds = new Set<Id<"books">>();
    for (const books of booksBySeries) {
      for (const book of books) {
        allBookIds.add(book._id);
      }
    }

    // 3. Fetch all bookAuthor rows for all books in parallel
    const bookIdList = [...allBookIds];
    const bookAuthorsByBookId = new Map<string, Array<{ authorId: Id<"authors"> }>>();

    const allBookAuthorRows = await Promise.all(
      bookIdList.map((bookId) =>
        ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", bookId))
          .collect()
      )
    );

    for (let i = 0; i < bookIdList.length; i++) {
      bookAuthorsByBookId.set(bookIdList[i], allBookAuthorRows[i]);
    }

    // 4. Collect all unique author IDs and batch-fetch
    const authorIds = new Set<Id<"authors">>();
    for (const rows of allBookAuthorRows) {
      for (const row of rows) {
        authorIds.add(row.authorId);
      }
    }

    const authorDocs = await Promise.all([...authorIds].map((id) => ctx.db.get(id)));
    const authorMap = new Map<string, { _id: Id<"authors">; name: string }>();
    for (const doc of authorDocs) {
      if (doc) {
        authorMap.set(doc._id, { _id: doc._id, name: doc.name });
      }
    }

    // 5. Assemble results
    return allSeries.map((series, i) => {
      const books = booksBySeries[i];

      // Collect unique authors for this series
      const seriesAuthorMap = new Map<string, { _id: string; name: string }>();
      for (const book of books) {
        const bas = bookAuthorsByBookId.get(book._id) ?? [];
        for (const ba of bas) {
          if (!seriesAuthorMap.has(ba.authorId)) {
            const author = authorMap.get(ba.authorId);
            if (author) {
              seriesAuthorMap.set(ba.authorId, author);
            }
          }
        }
      }

      return {
        ...series,
        bookCount: books.length,
        previewCovers: books.slice(0, 4).map((b) => ({
          _id: b._id,
          coverImageR2Key: b.coverImageR2Key,
        })),
        authors: Array.from(seriesAuthorMap.values()).slice(0, 3),
      };
    });
  },
});

// Get books in a series (ordered by seriesOrder)
export const getBooksInSeries = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const booksInSeries = await ctx.db
      .query("books")
      .withIndex("by_series_and_order", (q) => q.eq("seriesId", args.seriesId))
      .collect();

    // Sort by seriesOrder (nulls last)
    return booksInSeries.sort((a, b) => {
      if (a.seriesOrder === undefined) return 1;
      if (b.seriesOrder === undefined) return -1;
      return a.seriesOrder - b.seriesOrder;
    });
  },
});

// Get books in a series with authors (ordered by seriesOrder)
export const getBooksInSeriesWithAuthors = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const booksInSeries = await ctx.db
      .query("books")
      .withIndex("by_series_and_order", (q) => q.eq("seriesId", args.seriesId))
      .collect();

    // Sort by seriesOrder (nulls last)
    const sortedBooks = booksInSeries.sort((a, b) => {
      if (a.seriesOrder === undefined) return 1;
      if (b.seriesOrder === undefined) return -1;
      return a.seriesOrder - b.seriesOrder;
    });

    return await batchEnrichBooks(ctx, sortedBooks);
  },
});
