import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

// Create a new series
export const createSeries = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);

    const now = Date.now();

    const seriesId = await ctx.db.insert("series", {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });

    return seriesId;
  },
});

// Update a series
export const updateSeries = mutation({
  args: {
    seriesId: v.id("series"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);

    const updates: {
      name?: string;
      description?: string;
      updatedAt: number;
    } = {
      updatedAt: Date.now(),
    };

    if (args.name !== undefined) {
      updates.name = args.name;
    }

    if (args.description !== undefined) {
      updates.description = args.description;
    }

    await ctx.db.patch(args.seriesId, updates);

    return { success: true };
  },
});

// Delete a series
export const deleteSeries = mutation({
  args: { seriesId: v.id("series") },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);

    // Check if any books are still in this series
    const booksInSeries = await ctx.db
      .query("books")
      .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId))
      .first();

    if (booksInSeries) {
      throw new Error("Cannot delete series with books. Remove books from series first.");
    }

    await ctx.db.delete(args.seriesId);

    return { success: true };
  },
});
