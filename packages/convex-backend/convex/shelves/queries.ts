import { v } from "convex/values";

import { query } from "../_generated/server";
import { getCurrentUser, requireAuth } from "../lib/auth";

// Get a single shelf with enriched books
export const getShelf = query({
  args: { shelfId: v.id("shelves") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const shelf = await ctx.db.get(args.shelfId);
    if (!shelf) return null;

    const isOwner = currentUser?._id === shelf.userId;

    // Hide private shelves from non-owners
    if (!shelf.isPublic && !isOwner) return null;

    // Get owner info
    const owner = await ctx.db.get(shelf.userId);

    // Get shelf books
    const shelfBooks = await ctx.db
      .query("shelfBooks")
      .withIndex("by_shelf", (q) => q.eq("shelfId", args.shelfId))
      .collect();

    // Sort by position for ordered shelves, addedAt for unordered
    if (shelf.isOrdered) {
      shelfBooks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    } else {
      shelfBooks.sort((a, b) => a.addedAt - b.addedAt);
    }

    // Enrich books with authors and series (same pattern as books/queries.ts:getBook)
    const enrichedBooks = await Promise.all(
      shelfBooks.map(async (sb) => {
        const book = await ctx.db.get(sb.bookId);
        if (!book) return null;

        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const authors = await Promise.all(
          bookAuthors.map(async (ba) => {
            const author = await ctx.db.get(ba.authorId);
            return author ? { _id: author._id, name: author.name, role: ba.role } : null;
          })
        );

        const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

        return {
          ...book,
          shelfBookId: sb._id,
          position: sb.position,
          authors: authors.filter((a) => a !== null),
          series: series ? { _id: series._id, name: series.name } : null,
        };
      })
    );

    return {
      ...shelf,
      isOwner,
      owner: owner ? { _id: owner._id, name: owner.name, imageUrl: owner.imageUrl } : null,
      books: enrichedBooks.filter((b) => b !== null),
    };
  },
});

// Get shelves for a user's profile
export const getUserShelves = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUser = await getCurrentUser(ctx);
    const isOwner = currentUser?._id === args.userId;

    const shelves = await ctx.db
      .query("shelves")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    // Non-owners see only public shelves
    const visibleShelves = isOwner ? shelves : shelves.filter((s) => s.isPublic);

    // Add book counts and cover previews
    const shelvesWithCounts = await Promise.all(
      visibleShelves.map(async (shelf) => {
        const shelfBooks = await ctx.db
          .query("shelfBooks")
          .withIndex("by_shelf", (q) => q.eq("shelfId", shelf._id))
          .collect();

        // Get first 4 book covers for preview
        const previewBooks = await Promise.all(
          shelfBooks.slice(0, 4).map(async (sb) => {
            const book = await ctx.db.get(sb.bookId);
            return book
              ? { _id: book._id, title: book.title, coverImageR2Key: book.coverImageR2Key }
              : null;
          })
        );

        return {
          ...shelf,
          bookCount: shelfBooks.length,
          previewBooks: previewBooks.filter((b) => b !== null),
        };
      })
    );

    // Sort by most recently updated
    shelvesWithCounts.sort((a, b) => b.updatedAt - a.updatedAt);

    return { shelves: shelvesWithCounts, isOwner };
  },
});

// Get current user's shelves with containsBook boolean (for AddToShelfPopover)
export const getMyShelvesForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const shelves = await ctx.db
      .query("shelves")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const shelvesWithMembership = await Promise.all(
      shelves.map(async (shelf) => {
        const existing = await ctx.db
          .query("shelfBooks")
          .withIndex("by_shelf_and_book", (q) =>
            q.eq("shelfId", shelf._id).eq("bookId", args.bookId)
          )
          .first();

        return {
          _id: shelf._id,
          name: shelf.name,
          isOrdered: shelf.isOrdered,
          containsBook: existing !== null,
        };
      })
    );

    return shelvesWithMembership;
  },
});
