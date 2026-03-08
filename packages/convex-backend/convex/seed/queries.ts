import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";

/**
 * Read-only queries for enrichment and import scripts.
 *
 * WARNING: These queries bypass authentication and should ONLY be used
 * for development/testing purposes via scripts.
 */

// =============================================================================
// ENRICHMENT QUERIES
// =============================================================================

/**
 * Get books that are missing metadata (description, cover, isbn, publishedYear).
 * Returns books in batches using cursor-based pagination to avoid read limits.
 * The script calls this repeatedly until isDone=true.
 */
export const getBooksNeedingEnrichment = query({
  args: {
    cursor: v.optional(v.string()), // book _id to start after
    batchSize: v.optional(v.number()),
    force: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;

    // Manual cursor pagination: fetch a batch of books after the cursor
    let booksQuery = ctx.db.query("books");
    const allBooks = await booksQuery.collect();

    // Find start index from cursor
    const startIndex = args.cursor ? allBooks.findIndex((b) => b._id === args.cursor) + 1 : 0;

    // Scan forward from cursor, collecting books that need enrichment
    const results = [];
    let scanned = 0;
    let lastId: string | undefined;

    for (let i = startIndex; i < allBooks.length && results.length < batchSize; i++) {
      const book = allBooks[i];
      lastId = book._id;
      scanned++;

      const needsWork =
        args.force ||
        !book.description ||
        !book.coverImageR2Key ||
        !book.isbn ||
        !book.publishedYear;
      if (!needsWork) continue;

      // Get author names
      const bookAuthors = await ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .collect();

      const authorNames: string[] = [];
      for (const ba of bookAuthors) {
        const author = await ctx.db.get(ba.authorId);
        if (author) authorNames.push(author.name);
      }

      results.push({ ...book, authorNames });
    }

    const isDone = startIndex + scanned >= allBooks.length;

    return {
      books: results,
      nextCursor: isDone ? null : (lastId ?? null),
      isDone,
      totalScanned: allBooks.length,
    };
  },
});

/**
 * Get authors that are missing metadata (bio, imageR2Key).
 * Uses cursor-based pagination to handle large datasets.
 */
export const getAuthorsNeedingEnrichment = query({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;
    const allAuthors = await ctx.db.query("authors").collect();

    const startIndex = args.cursor ? allAuthors.findIndex((a) => a._id === args.cursor) + 1 : 0;

    const results = [];
    let scanned = 0;
    let lastId: string | undefined;

    for (let i = startIndex; i < allAuthors.length && results.length < batchSize; i++) {
      const author = allAuthors[i];
      lastId = author._id;
      scanned++;

      if (!author.bio || !author.imageR2Key) {
        results.push(author);
      }
    }

    const isDone = startIndex + scanned >= allAuthors.length;

    return {
      authors: results,
      nextCursor: isDone ? null : (lastId ?? null),
      isDone,
      totalScanned: allAuthors.length,
    };
  },
});

// =============================================================================
// DEDUP QUERIES
// =============================================================================

/**
 * Get the first admin or editor user to attribute genre votes to.
 */
export const getEditorUserId = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    const editor = users.find((u) => u.role === "admin" || u.role === "editor");
    return editor?._id ?? null;
  },
});

/**
 * Check if a book already has genre votes.
 */
export const bookHasGenreVotes = query({
  args: { bookId: v.string() },
  handler: async (ctx, args) => {
    const bookId = args.bookId as Id<"books">;
    const vote = await ctx.db
      .query("bookGenreVotes")
      .withIndex("by_book", (q) => q.eq("bookId", bookId))
      .first();
    return !!vote;
  },
});

/**
 * Find a book by ISBN (uses by_isbn index).
 */
export const findBookByIsbn = query({
  args: { isbn: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("books")
      .withIndex("by_isbn", (q) => q.eq("isbn", args.isbn))
      .first();
  },
});

/**
 * Find a book by exact title (uses by_title index).
 */
export const findBookByTitle = query({
  args: { title: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("books")
      .withIndex("by_title", (q) => q.eq("title", args.title))
      .first();
  },
});

/**
 * Find an author by exact name (uses by_name index).
 */
export const findAuthorByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authors")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});

/**
 * Find a series by exact name (uses by_name index).
 */
export const findSeriesByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("series")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});
