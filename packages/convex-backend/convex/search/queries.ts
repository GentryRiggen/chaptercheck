import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";
import { batchEnrichAuthors, batchEnrichBooks } from "../lib/enrichment";

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

    // --- Series ---
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

    const seriesWithCounts = matchingSeries.map((s, i) => ({
      ...s,
      bookCount: seriesBookArrays[i].length,
    }));

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

    const enrichedBooks = await batchEnrichBooks(ctx, cappedBooks);

    // --- Authors ---
    const authors = await ctx.db
      .query("authors")
      .withSearchIndex("search_authors", (q) => q.search("name", searchTerm))
      .take(10);

    const authorsWithCounts = await batchEnrichAuthors(ctx, authors);

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

    return {
      books: enrichedBooks,
      authors: authorsWithCounts,
      series: seriesWithCounts,
      users,
    };
  },
});
