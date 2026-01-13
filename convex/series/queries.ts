import { v } from "convex/values";
import { query } from "../_generated/server";

// Get a single series by ID
export const getSeries = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.seriesId);
  },
});

// Search series by name
export const searchSeries = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, args) => {
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
    return await ctx.db
      .query("series")
      .order("desc")
      .take(100);
  },
});

// Get books in a series (ordered by seriesOrder)
export const getBooksInSeries = query({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
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
