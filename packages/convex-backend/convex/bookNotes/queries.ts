import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Get the current user's private notes for a book.
 * Results are enriched with category and audio file display info and sorted by timeline.
 */
export const getMyNotesForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const notes = await ctx.db
      .query("bookNotes")
      .withIndex("by_user_and_book", (q) => q.eq("userId", user._id).eq("bookId", args.bookId))
      .collect();

    const enriched = await Promise.all(
      notes.map(async (note) => {
        const [audioFile, category] = await Promise.all([
          ctx.db.get(note.audioFileId),
          note.categoryId ? ctx.db.get(note.categoryId) : Promise.resolve(null),
        ]);

        if (!audioFile) {
          return null;
        }

        if (category && category.userId !== user._id) {
          return null;
        }

        return {
          ...note,
          audioFile: {
            _id: audioFile._id,
            displayName: audioFile.chapterTitle || audioFile.fileName,
            fileName: audioFile.fileName,
            partNumber: audioFile.partNumber,
            chapterNumber: audioFile.chapterNumber,
            duration: audioFile.duration,
          },
          category: category
            ? {
                _id: category._id,
                name: category.name,
                colorToken: category.colorToken,
              }
            : null,
        };
      })
    );

    return enriched
      .filter((note) => note !== null)
      .sort((a, b) => {
        const partDelta = (a.audioFile.partNumber ?? 0) - (b.audioFile.partNumber ?? 0);
        if (partDelta !== 0) return partDelta;
        return a.startSeconds - b.startSeconds;
      });
  },
});

/**
 * Get the current user's reusable note categories.
 */
export const getMyNoteCategories = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const categories = await ctx.db
      .query("noteCategories")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return categories.sort((a, b) => {
      const updatedDelta = b.updatedAt - a.updatedAt;
      if (updatedDelta !== 0) return updatedDelta;
      return a.name.localeCompare(b.name);
    });
  },
});
