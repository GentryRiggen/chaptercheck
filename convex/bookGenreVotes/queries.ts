import { v } from "convex/values";

import { type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getCurrentUser, requireAuth } from "../lib/auth";

// Get genres for a book with vote counts (sorted by votes desc)
export const getGenresForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    // Get current user to check if they voted
    const currentUser = await getCurrentUser(ctx);

    // Get all votes for this book
    const votes = await ctx.db
      .query("bookGenreVotes")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    // Count votes per genre and track user's votes
    const genreVoteCounts = new Map<Id<"genres">, number>();
    const userVotedGenreIds = new Set<Id<"genres">>();

    for (const vote of votes) {
      const genreId = vote.genreId;
      genreVoteCounts.set(genreId, (genreVoteCounts.get(genreId) || 0) + 1);
      if (currentUser && vote.userId === currentUser._id) {
        userVotedGenreIds.add(genreId);
      }
    }

    // Fetch genre details and combine with counts
    const genresWithCounts = await Promise.all(
      Array.from(genreVoteCounts.entries()).map(async ([genreId, voteCount]) => {
        const genre = await ctx.db.get(genreId);
        if (!genre) return null;

        return {
          _id: genre._id,
          name: genre.name,
          slug: genre.slug,
          voteCount,
          userHasVoted: userVotedGenreIds.has(genreId),
        };
      })
    );

    // Filter out nulls and sort by vote count (desc), then by name (asc)
    return genresWithCounts
      .filter((g) => g !== null)
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) {
          return b.voteCount - a.voteCount;
        }
        return a.name.localeCompare(b.name);
      });
  },
});

// Get current user's genre votes for a book (for review form pre-selection)
export const getMyGenreVotesForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    if (!currentUser) {
      return [];
    }

    const votes = await ctx.db
      .query("bookGenreVotes")
      .withIndex("by_book_and_user", (q) =>
        q.eq("bookId", args.bookId).eq("userId", currentUser._id)
      )
      .collect();

    return votes.map((vote) => vote.genreId);
  },
});
