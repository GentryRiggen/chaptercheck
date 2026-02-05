import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

// Get all genres (for forms/selects)
export const getAllGenres = query({
  args: {},
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.db.query("genres").order("asc").collect();
  },
});

// Search genres by name
export const searchGenres = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const searchTerm = args.search.trim();

    if (searchTerm.length === 0) {
      return [];
    }

    const genres = await ctx.db
      .query("genres")
      .withSearchIndex("search_genres", (q) => q.search("name", searchTerm))
      .take(50);

    return genres;
  },
});
