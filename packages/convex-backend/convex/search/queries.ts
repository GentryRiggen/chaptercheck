import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { createBookEnricher } from "../books/queries";

// Unified search: returns both books and authors in a single reactive subscription
export const searchAll = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const searchTerm = args.search.trim();

    if (searchTerm.length === 0) {
      return { books: [], authors: [] };
    }

    // --- Books ---
    const books = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) => q.search("title", searchTerm))
      .take(20);

    // Also search series by name and include their books
    const matchingSeries = await ctx.db
      .query("series")
      .withSearchIndex("search_series", (q) => q.search("name", searchTerm))
      .take(10);

    const seriesBookArrays = await Promise.all(
      matchingSeries.map((s) =>
        ctx.db
          .query("books")
          .withIndex("by_series", (q) => q.eq("seriesId", s._id))
          .collect()
      )
    );
    const seriesBooks = seriesBookArrays.flat();

    // Merge and deduplicate (title results first for relevance)
    const seenIds = new Set(books.map((b) => b._id));
    const mergedBooks = [...books];
    for (const book of seriesBooks) {
      if (!seenIds.has(book._id)) {
        seenIds.add(book._id);
        mergedBooks.push(book);
      }
    }
    const cappedBooks = mergedBooks.slice(0, 20);

    const enrichBook = createBookEnricher(ctx);
    const enrichedBooks = await Promise.all(cappedBooks.map((book) => enrichBook(book)));

    // --- Authors ---
    const authors = await ctx.db
      .query("authors")
      .withSearchIndex("search_authors", (q) => q.search("name", searchTerm))
      .take(10);

    const authorsWithCounts = await Promise.all(
      authors.map(async (author) => {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_author", (q) => q.eq("authorId", author._id))
          .collect();

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

    // --- Users ---
    const usersRaw = await ctx.db
      .query("users")
      .withSearchIndex("search_users", (q) => q.search("name", searchTerm))
      .take(10);

    // Filter out private profiles
    const users = usersRaw
      .filter((u) => !u.isProfilePrivate)
      .map((u) => ({
        _id: u._id,
        name: u.name,
        imageUrl: u.imageUrl,
      }));

    return { books: enrichedBooks, authors: authorsWithCounts, users };
  },
});
