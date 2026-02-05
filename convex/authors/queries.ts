import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

// Get a single author by ID
export const getAuthor = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const author = await ctx.db.get(args.authorId);
    return author;
  },
});

// List all authors with pagination and counts (for infinite scroll), sorted alphabetically
export const listAuthors = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const results = await ctx.db
      .query("authors")
      .withIndex("by_name")
      .order("asc")
      .paginate(args.paginationOpts);

    // Enrich with book and series counts
    const authorsWithCounts = await Promise.all(
      results.page.map(async (author) => {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_author", (q) => q.eq("authorId", author._id))
          .collect();

        // Count unique series
        const seriesIds = new Set<string>();
        for (const ba of bookAuthors) {
          const book = await ctx.db.get(ba.bookId);
          if (book?.seriesId) {
            seriesIds.add(book.seriesId);
          }
        }

        return {
          ...author,
          bookCount: bookAuthors.length,
          seriesCount: seriesIds.size,
        };
      })
    );

    return {
      ...results,
      page: authorsWithCounts,
    };
  },
});

// Get recent authors (for home page)
export const getRecentAuthors = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 6;
    const authors = await ctx.db.query("authors").order("desc").take(limit);

    // Enrich with book and series counts
    const authorsWithCounts = await Promise.all(
      authors.map(async (author) => {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_author", (q) => q.eq("authorId", author._id))
          .collect();

        // Count unique series
        const seriesIds = new Set<string>();
        for (const ba of bookAuthors) {
          const book = await ctx.db.get(ba.bookId);
          if (book?.seriesId) {
            seriesIds.add(book.seriesId);
          }
        }

        return {
          ...author,
          bookCount: bookAuthors.length,
          seriesCount: seriesIds.size,
        };
      })
    );

    return authorsWithCounts;
  },
});

// Get all authors (for forms/selects)
export const getAllAuthors = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("authors").order("asc").collect();
  },
});

// Search authors by name
export const searchAuthors = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const searchTerm = args.search.trim();

    if (searchTerm.length === 0) {
      return [];
    }

    const authors = await ctx.db
      .query("authors")
      .withSearchIndex("search_authors", (q) => q.search("name", searchTerm))
      .take(50);

    // Enrich with book and series counts
    const authorsWithCounts = await Promise.all(
      authors.map(async (author) => {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_author", (q) => q.eq("authorId", author._id))
          .collect();

        // Count unique series
        const seriesIds = new Set<string>();
        for (const ba of bookAuthors) {
          const book = await ctx.db.get(ba.bookId);
          if (book?.seriesId) {
            seriesIds.add(book.seriesId);
          }
        }

        return {
          ...author,
          bookCount: bookAuthors.length,
          seriesCount: seriesIds.size,
        };
      })
    );

    return authorsWithCounts;
  },
});

// Get books for an author
export const getAuthorBooks = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // Get all book-author relationships for this author
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();

    // Fetch all books
    const books = await Promise.all(
      bookAuthors.map(async (ba) => {
        const book = await ctx.db.get(ba.bookId);
        return book ? { ...book, role: ba.role } : null;
      })
    );

    return books.filter((book) => book !== null);
  },
});

// Get series for an author (series containing books by this author)
export const getAuthorSeries = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Get all book-author relationships for this author
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();

    // Fetch all books and collect unique series IDs with counts
    const seriesCounts = new Map<string, number>();

    for (const ba of bookAuthors) {
      const book = await ctx.db.get(ba.bookId);
      if (!book || !book.seriesId) continue;

      seriesCounts.set(book.seriesId, (seriesCounts.get(book.seriesId) || 0) + 1);
    }

    // Fetch series details
    const seriesWithCounts = await Promise.all(
      Array.from(seriesCounts.entries()).map(async ([seriesId, count]) => {
        const series = await ctx.db.get(seriesId as Id<"series">);
        if (!series) return null;
        return {
          _id: series._id,
          name: series.name,
          description: series.description,
          bookCountByAuthor: count,
        };
      })
    );

    return seriesWithCounts.filter((s) => s !== null);
  },
});

// Preview what will happen when deleting an author
export const getAuthorDeletionPreview = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    // Get all book-author relationships for this author
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();

    const booksToDelete: Array<{ _id: string; title: string }> = [];
    const booksToKeep: Array<{
      _id: string;
      title: string;
      otherAuthors: string[];
    }> = [];

    for (const ba of bookAuthors) {
      const book = await ctx.db.get(ba.bookId);
      if (!book) continue;

      // Get all authors for this book
      const allBookAuthors = await ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", ba.bookId))
        .collect();

      // Get other authors (excluding the one being deleted)
      const otherAuthorIds = allBookAuthors
        .filter((a) => a.authorId !== args.authorId)
        .map((a) => a.authorId);

      if (otherAuthorIds.length === 0) {
        // This author is the only author - book will be deleted
        booksToDelete.push({ _id: book._id, title: book.title });
      } else {
        // Book has other authors - will be kept
        const otherAuthors = await Promise.all(
          otherAuthorIds.map(async (id) => {
            const author = await ctx.db.get(id);
            return author?.name || "Unknown";
          })
        );
        booksToKeep.push({
          _id: book._id,
          title: book.title,
          otherAuthors,
        });
      }
    }

    return {
      booksToDelete,
      booksToKeep,
      totalBooks: bookAuthors.length,
    };
  },
});
