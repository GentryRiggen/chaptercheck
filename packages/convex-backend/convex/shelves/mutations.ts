import { v } from "convex/values";

import { mutation } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

// Create a new shelf
export const createShelf = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    isOrdered: v.boolean(),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const now = Date.now();

    const shelfId = await ctx.db.insert("shelves", {
      userId: user._id,
      name: args.name,
      description: args.description,
      isOrdered: args.isOrdered,
      isPublic: args.isPublic,
      createdAt: now,
      updatedAt: now,
    });

    return shelfId;
  },
});

// Update a shelf
export const updateShelf = mutation({
  args: {
    shelfId: v.id("shelves"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isOrdered: v.optional(v.boolean()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const shelf = await ctx.db.get(args.shelfId);

    if (!shelf) throw new Error("Shelf not found");
    if (shelf.userId !== user._id) throw new Error("Not authorized");

    const { shelfId, ...updates } = args;
    await ctx.db.patch(shelfId, {
      ...updates,
      updatedAt: Date.now(),
    });

    return shelfId;
  },
});

// Delete a shelf and all its book entries
export const deleteShelf = mutation({
  args: { shelfId: v.id("shelves") },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const shelf = await ctx.db.get(args.shelfId);

    if (!shelf) throw new Error("Shelf not found");
    if (shelf.userId !== user._id) throw new Error("Not authorized");

    // Delete all shelfBooks entries
    const shelfBooks = await ctx.db
      .query("shelfBooks")
      .withIndex("by_shelf", (q) => q.eq("shelfId", args.shelfId))
      .collect();

    await Promise.all(shelfBooks.map((sb) => ctx.db.delete(sb._id)));

    // Delete the shelf
    await ctx.db.delete(args.shelfId);

    return { success: true };
  },
});

// Add a book to a shelf
export const addBookToShelf = mutation({
  args: {
    shelfId: v.id("shelves"),
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const shelf = await ctx.db.get(args.shelfId);

    if (!shelf) throw new Error("Shelf not found");
    if (shelf.userId !== user._id) throw new Error("Not authorized");

    // Check for duplicates
    const existing = await ctx.db
      .query("shelfBooks")
      .withIndex("by_shelf_and_book", (q) =>
        q.eq("shelfId", args.shelfId).eq("bookId", args.bookId)
      )
      .first();

    if (existing) return existing._id;

    // Auto-assign next position for ordered shelves
    let position: number | undefined;
    if (shelf.isOrdered) {
      const shelfBooks = await ctx.db
        .query("shelfBooks")
        .withIndex("by_shelf", (q) => q.eq("shelfId", args.shelfId))
        .collect();
      position = shelfBooks.length + 1;
    }

    const shelfBookId = await ctx.db.insert("shelfBooks", {
      shelfId: args.shelfId,
      bookId: args.bookId,
      position,
      addedAt: Date.now(),
    });

    // Update shelf's updatedAt
    await ctx.db.patch(args.shelfId, { updatedAt: Date.now() });

    return shelfBookId;
  },
});

// Remove a book from a shelf
export const removeBookFromShelf = mutation({
  args: {
    shelfId: v.id("shelves"),
    bookId: v.id("books"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const shelf = await ctx.db.get(args.shelfId);

    if (!shelf) throw new Error("Shelf not found");
    if (shelf.userId !== user._id) throw new Error("Not authorized");

    const shelfBook = await ctx.db
      .query("shelfBooks")
      .withIndex("by_shelf_and_book", (q) =>
        q.eq("shelfId", args.shelfId).eq("bookId", args.bookId)
      )
      .first();

    if (!shelfBook) return { success: true };

    await ctx.db.delete(shelfBook._id);

    // Recompact positions for ordered shelves
    if (shelf.isOrdered) {
      const remaining = await ctx.db
        .query("shelfBooks")
        .withIndex("by_shelf_and_position", (q) => q.eq("shelfId", args.shelfId))
        .collect();

      remaining.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

      await Promise.all(remaining.map((sb, i) => ctx.db.patch(sb._id, { position: i + 1 })));
    }

    // Update shelf's updatedAt
    await ctx.db.patch(args.shelfId, { updatedAt: Date.now() });

    return { success: true };
  },
});

// Reorder books in a shelf
export const reorderShelfBooks = mutation({
  args: {
    shelfId: v.id("shelves"),
    bookIds: v.array(v.id("books")),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const shelf = await ctx.db.get(args.shelfId);

    if (!shelf) throw new Error("Shelf not found");
    if (shelf.userId !== user._id) throw new Error("Not authorized");

    // Update positions based on new order
    await Promise.all(
      args.bookIds.map(async (bookId, index) => {
        const shelfBook = await ctx.db
          .query("shelfBooks")
          .withIndex("by_shelf_and_book", (q) => q.eq("shelfId", args.shelfId).eq("bookId", bookId))
          .first();

        if (shelfBook) {
          await ctx.db.patch(shelfBook._id, { position: index + 1 });
        }
      })
    );

    await ctx.db.patch(args.shelfId, { updatedAt: Date.now() });

    return { success: true };
  },
});
