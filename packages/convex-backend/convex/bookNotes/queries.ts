import { v } from "convex/values";

import { query } from "../_generated/server";
import { requireAuth } from "../lib/auth";

/**
 * Get the current user's private notes for a book.
 * Results are enriched with tags, legacy categories, and optional audio file display info.
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
        const [audioFile, category, tagRows] = await Promise.all([
          note.audioFileId ? ctx.db.get(note.audioFileId) : Promise.resolve(null),
          note.categoryId ? ctx.db.get(note.categoryId) : Promise.resolve(null),
          ctx.db
            .query("bookNoteTags")
            .withIndex("by_note", (q) => q.eq("noteId", note._id))
            .collect(),
        ]);

        if (category && category.userId !== user._id) {
          return null;
        }

        const tags = (
          await Promise.all(
            tagRows.map(async (row) => {
              const tag = await ctx.db.get(row.tagId);
              if (!tag || tag.userId !== user._id) return null;
              return {
                _id: tag._id,
                name: tag.name,
                normalizedName: tag.normalizedName,
              };
            })
          )
        ).filter((tag) => tag !== null);

        return {
          ...note,
          audioFile: audioFile
            ? {
                _id: audioFile._id,
                displayName: audioFile.chapterTitle || audioFile.fileName,
                fileName: audioFile.fileName,
                partNumber: audioFile.partNumber,
                chapterNumber: audioFile.chapterNumber,
                duration: audioFile.duration,
              }
            : null,
          category: category
            ? {
                _id: category._id,
                name: category.name,
                colorToken: category.colorToken,
              }
            : null,
          tags,
        };
      })
    );

    return enriched
      .filter((note) => note !== null)
      .sort((a, b) => {
        const aPart = a.audioFile?.partNumber ?? Number.MAX_SAFE_INTEGER;
        const bPart = b.audioFile?.partNumber ?? Number.MAX_SAFE_INTEGER;
        if (aPart !== bPart) return aPart - bPart;

        const aStart = a.startSeconds ?? a.createdAt;
        const bStart = b.startSeconds ?? b.createdAt;
        return aStart - bStart;
      });
  },
});

/**
 * Legacy category query retained briefly for compatibility.
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

/**
 * Get ALL of the current user's notes across every book, ordered by most recently updated.
 * Each note is enriched with book summary, audio file info, and tags.
 */
export const getMyAllNotes = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const notes = await ctx.db
      .query("bookNotes")
      .withIndex("by_user_and_updatedAt", (q) => q.eq("userId", user._id))
      .order("desc")
      .collect();

    const enriched = await Promise.all(
      notes.map(async (note) => {
        const [book, audioFile, tagRows] = await Promise.all([
          ctx.db.get(note.bookId),
          note.audioFileId ? ctx.db.get(note.audioFileId) : Promise.resolve(null),
          ctx.db
            .query("bookNoteTags")
            .withIndex("by_note", (q) => q.eq("noteId", note._id))
            .collect(),
        ]);

        if (!book) return null;

        // Get primary author via bookAuthors join table
        const bookAuthorRow = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", note.bookId))
          .first();
        const primaryAuthor = bookAuthorRow ? await ctx.db.get(bookAuthorRow.authorId) : null;

        const tags = (
          await Promise.all(
            tagRows.map(async (row) => {
              const tag = await ctx.db.get(row.tagId);
              if (!tag || tag.userId !== user._id) return null;
              return {
                _id: tag._id,
                name: tag.name,
                normalizedName: tag.normalizedName,
              };
            })
          )
        ).filter((tag) => tag !== null);

        return {
          ...note,
          book: {
            _id: book._id,
            title: book.title,
            coverImageR2Key: book.coverImageR2Key ?? null,
            primaryAuthorName: primaryAuthor?.name ?? null,
          },
          audioFile: audioFile
            ? {
                _id: audioFile._id,
                displayName: audioFile.chapterTitle || audioFile.fileName,
                fileName: audioFile.fileName,
                partNumber: audioFile.partNumber,
                chapterNumber: audioFile.chapterNumber,
                duration: audioFile.duration,
              }
            : null,
          tags,
        };
      })
    );

    return enriched.filter((note) => note !== null);
  },
});

export const getMyMemoryTags = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const tags = await ctx.db
      .query("memoryTags")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    return tags.sort((a, b) => {
      const updatedDelta = b.updatedAt - a.updatedAt;
      if (updatedDelta !== 0) return updatedDelta;
      return a.name.localeCompare(b.name);
    });
  },
});
