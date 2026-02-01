import { v } from "convex/values";
import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

// Create a new author
export const createAuthor = mutation({
  args: {
    name: v.string(),
    bio: v.optional(v.string()),
    imageR2Key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);

    const now = Date.now();

    const authorId = await ctx.db.insert("authors", {
      name: args.name,
      bio: args.bio,
      imageR2Key: args.imageR2Key,
      createdAt: now,
      updatedAt: now,
    });

    return authorId;
  },
});

// Update an existing author
export const updateAuthor = mutation({
  args: {
    authorId: v.id("authors"),
    name: v.optional(v.string()),
    bio: v.optional(v.string()),
    imageR2Key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);

    const { authorId, ...updates } = args;

    await ctx.db.patch(authorId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return authorId;
  },
});

// Delete an author and cascade to single-author books
export const deleteAuthor = mutation({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    await requireAuthMutation(ctx);

    // Get all book-author relationships for this author
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();

    for (const ba of bookAuthors) {
      // Get all authors for this book
      const allBookAuthors = await ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", ba.bookId))
        .collect();

      // Check if this author is the only author
      const otherAuthors = allBookAuthors.filter((a) => a.authorId !== args.authorId);

      if (otherAuthors.length === 0) {
        // This is the only author - delete the book and its audio files

        // Delete audio files for this book
        const audioFiles = await ctx.db
          .query("audioFiles")
          .withIndex("by_book", (q) => q.eq("bookId", ba.bookId))
          .collect();

        for (const audioFile of audioFiles) {
          await ctx.db.delete(audioFile._id);
        }

        // Delete the book
        await ctx.db.delete(ba.bookId);
      }

      // Delete the book-author relationship
      await ctx.db.delete(ba._id);
    }

    // Finally, delete the author
    await ctx.db.delete(args.authorId);

    return { success: true };
  },
});
