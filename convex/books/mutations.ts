import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireEditorMutation } from "../lib/auth";

// Create a new book
export const createBook = mutation({
  args: {
    title: v.string(),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    isbn: v.optional(v.string()),
    publishedYear: v.optional(v.number()),
    coverImageR2Key: v.optional(v.string()),
    language: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    seriesOrder: v.optional(v.number()),
    authorIds: v.optional(v.array(v.id("authors"))),
    genreIds: v.optional(v.array(v.id("genres"))),
  },
  handler: async (ctx, args) => {
    const { user } = await requireEditorMutation(ctx);

    const { authorIds, genreIds, ...bookData } = args;
    const now = Date.now();

    const bookId = await ctx.db.insert("books", {
      ...bookData,
      createdAt: now,
      updatedAt: now,
    });

    // Add author relationships if provided
    if (authorIds && authorIds.length > 0) {
      await Promise.all(
        authorIds.map((authorId) =>
          ctx.db.insert("bookAuthors", {
            bookId,
            authorId,
            role: "author",
          })
        )
      );
    }

    // Add genre votes from the editor
    if (genreIds && genreIds.length > 0) {
      await Promise.all(
        genreIds.map((genreId) =>
          ctx.db.insert("bookGenreVotes", {
            bookId,
            genreId,
            userId: user._id,
            createdAt: now,
          })
        )
      );
    }

    return bookId;
  },
});

// Update an existing book
export const updateBook = mutation({
  args: {
    bookId: v.id("books"),
    title: v.optional(v.string()),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    isbn: v.optional(v.string()),
    publishedYear: v.optional(v.number()),
    coverImageR2Key: v.optional(v.string()),
    language: v.optional(v.string()),
    duration: v.optional(v.number()),
    seriesId: v.optional(v.id("series")),
    seriesOrder: v.optional(v.number()),
    authorIds: v.optional(v.array(v.id("authors"))),
    genreIds: v.optional(v.array(v.id("genres"))),
  },
  handler: async (ctx, args) => {
    const { user } = await requireEditorMutation(ctx);

    const { bookId, authorIds, genreIds, ...updates } = args;
    const now = Date.now();

    await ctx.db.patch(bookId, {
      ...updates,
      updatedAt: now,
    });

    // Update author relationships if provided
    if (authorIds !== undefined) {
      // Delete existing relationships
      const existingBookAuthors = await ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .collect();

      await Promise.all(existingBookAuthors.map((ba) => ctx.db.delete(ba._id)));

      // Add new relationships
      if (authorIds.length > 0) {
        await Promise.all(
          authorIds.map((authorId) =>
            ctx.db.insert("bookAuthors", {
              bookId,
              authorId,
              role: "author",
            })
          )
        );
      }
    }

    // Update genre votes for this editor if provided
    if (genreIds !== undefined) {
      // Delete existing votes from this user
      const existingVotes = await ctx.db
        .query("bookGenreVotes")
        .withIndex("by_book_and_user", (q) => q.eq("bookId", bookId).eq("userId", user._id))
        .collect();

      await Promise.all(existingVotes.map((vote) => ctx.db.delete(vote._id)));

      // Add new votes
      if (genreIds.length > 0) {
        await Promise.all(
          genreIds.map((genreId) =>
            ctx.db.insert("bookGenreVotes", {
              bookId,
              genreId,
              userId: user._id,
              createdAt: now,
            })
          )
        );
      }
    }

    return bookId;
  },
});

// Delete a book
export const deleteBook = mutation({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requireEditorMutation(ctx);

    // Delete all book-author relationships
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    await Promise.all(bookAuthors.map((ba) => ctx.db.delete(ba._id)));

    // Delete all audio files for this book
    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    await Promise.all(audioFiles.map((af) => ctx.db.delete(af._id)));

    // Delete the book
    await ctx.db.delete(args.bookId);

    return { success: true };
  },
});

// Add an author to a book
export const addAuthorToBook = mutation({
  args: {
    bookId: v.id("books"),
    authorId: v.id("authors"),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireEditorMutation(ctx);

    // Check if relationship already exists
    const existing = await ctx.db
      .query("bookAuthors")
      .withIndex("by_book_and_author", (q) =>
        q.eq("bookId", args.bookId).eq("authorId", args.authorId)
      )
      .first();

    if (existing) {
      throw new Error("Author already associated with this book");
    }

    const bookAuthorId = await ctx.db.insert("bookAuthors", {
      bookId: args.bookId,
      authorId: args.authorId,
      role: args.role || "author",
    });

    return bookAuthorId;
  },
});

// Remove an author from a book
export const removeAuthorFromBook = mutation({
  args: {
    bookId: v.id("books"),
    authorId: v.id("authors"),
  },
  handler: async (ctx, args) => {
    await requireEditorMutation(ctx);

    const bookAuthor = await ctx.db
      .query("bookAuthors")
      .withIndex("by_book_and_author", (q) =>
        q.eq("bookId", args.bookId).eq("authorId", args.authorId)
      )
      .first();

    if (!bookAuthor) {
      throw new Error("Author not associated with this book");
    }

    await ctx.db.delete(bookAuthor._id);
    return { success: true };
  },
});
