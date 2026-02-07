import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireEditorMutation } from "../lib/auth";

/**
 * Generate a slug from a genre name
 * e.g., "Science Fiction" -> "science-fiction"
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special characters
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-"); // Replace multiple hyphens with single
}

// Create a new genre (editor-only)
export const createGenre = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireEditorMutation(ctx);

    const name = args.name.trim();
    if (name.length < 2 || name.length > 50) {
      throw new Error("Genre name must be between 2 and 50 characters");
    }

    const slug = generateSlug(name);

    // Check for duplicate slug
    const existing = await ctx.db
      .query("genres")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .first();

    if (existing) {
      throw new Error(`A genre with a similar name already exists: "${existing.name}"`);
    }

    const now = Date.now();

    const genreId = await ctx.db.insert("genres", {
      name,
      slug,
      createdAt: now,
      updatedAt: now,
    });

    return genreId;
  },
});

// Delete a genre (editor-only, cascades to delete all votes)
export const deleteGenre = mutation({
  args: { genreId: v.id("genres") },
  handler: async (ctx, args) => {
    await requireEditorMutation(ctx);

    // Delete all votes for this genre
    const votes = await ctx.db
      .query("bookGenreVotes")
      .withIndex("by_genre", (q) => q.eq("genreId", args.genreId))
      .collect();

    await Promise.all(votes.map((vote) => ctx.db.delete(vote._id)));

    // Delete the genre
    await ctx.db.delete(args.genreId);

    return { success: true };
  },
});
