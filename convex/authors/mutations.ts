import { v } from "convex/values";
import { mutation } from "../_generated/server";

// Create a new author
export const createAuthor = mutation({
  args: {
    name: v.string(),
    bio: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    const authorId = await ctx.db.insert("authors", {
      name: args.name,
      bio: args.bio,
      imageUrl: args.imageUrl,
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
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    const { authorId, ...updates } = args;

    await ctx.db.patch(authorId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return authorId;
  },
});

// Delete an author
export const deleteAuthor = mutation({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // Check if author has any books
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .first();

    if (bookAuthors) {
      throw new Error(
        "Cannot delete author with associated books. Remove books first."
      );
    }

    await ctx.db.delete(args.authorId);
    return { success: true };
  },
});
