import { v } from "convex/values";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

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

    return await Promise.all(
      allSeries.map(async (series) => {
        const books = await ctx.db
          .query("books")
          .withIndex("by_series_and_order", (q) => q.eq("seriesId", series._id))
          .collect();

        // Sort by seriesOrder (nulls last)
        books.sort((a, b) => {
          if (a.seriesOrder === undefined) return 1;
          if (b.seriesOrder === undefined) return -1;
          return a.seriesOrder - b.seriesOrder;
        });

        // Collect unique authors from all books (deduplicated by authorId)
        const authorMap = new Map<string, { _id: string; name: string }>();
        for (const book of books) {
          const bookAuthors = await ctx.db
            .query("bookAuthors")
            .withIndex("by_book", (q) => q.eq("bookId", book._id))
            .collect();
          for (const ba of bookAuthors) {
            if (!authorMap.has(ba.authorId)) {
              const author = await ctx.db.get(ba.authorId);
              if (author) {
                authorMap.set(ba.authorId, {
                  _id: author._id,
                  name: author.name,
                });
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
          authors: Array.from(authorMap.values()).slice(0, 3),
        };
      })
    );
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

    // Enrich with authors
    const booksWithAuthors = await Promise.all(
      sortedBooks.map(async (book) => {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const authors = await Promise.all(
          bookAuthors.map(async (ba) => {
            const author = await ctx.db.get(ba.authorId);
            return author ? { ...author, role: ba.role } : null;
          })
        );

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
        };
      })
    );

    return booksWithAuthors;
  },
});
