import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

// Toggle a single genre vote for a book (for quick voting on book page)
export const toggleGenreVote = mutation({
  args: {
    bookId: v.id("books"),
    genreId: v.id("genres"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    // Check if vote already exists
    const existingVote = await ctx.db
      .query("bookGenreVotes")
      .withIndex("by_book_genre_user", (q) =>
        q.eq("bookId", args.bookId).eq("genreId", args.genreId).eq("userId", user._id)
      )
      .first();

    if (existingVote) {
      // Remove vote
      await ctx.db.delete(existingVote._id);
      return { action: "removed" as const };
    } else {
      // Add vote
      await ctx.db.insert("bookGenreVotes", {
        bookId: args.bookId,
        genreId: args.genreId,
        userId: user._id,
        createdAt: Date.now(),
      });
      return { action: "added" as const };
    }
  },
});

// Batch update user's genre votes for a book (for review form submission)
export const setGenreVotes = mutation({
  args: {
    bookId: v.id("books"),
    genreIds: v.array(v.id("genres")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);

    // Get existing votes for this user and book
    const existingVotes = await ctx.db
      .query("bookGenreVotes")
      .withIndex("by_book_and_user", (q) => q.eq("bookId", args.bookId).eq("userId", user._id))
      .collect();

    const existingGenreIds = new Set(existingVotes.map((v) => v.genreId));
    const newGenreIds = new Set(args.genreIds);

    // Delete votes that are no longer selected
    for (const vote of existingVotes) {
      if (!newGenreIds.has(vote.genreId)) {
        await ctx.db.delete(vote._id);
      }
    }

    // Add new votes
    const now = Date.now();
    for (const genreId of args.genreIds) {
      if (!existingGenreIds.has(genreId)) {
        await ctx.db.insert("bookGenreVotes", {
          bookId: args.bookId,
          genreId,
          userId: user._id,
          createdAt: now,
        });
      }
    }

    return { success: true };
  },
});
