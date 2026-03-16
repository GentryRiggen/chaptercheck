import { v } from "convex/values";

import { type Doc, type Id } from "../_generated/dataModel";
import { query } from "../_generated/server";
import { getCurrentUser, requireAuth } from "../lib/auth";
import { getWantToReadShelfBook } from "../lib/wantToReadShelf";

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

    // Batch-enrich books with authors and series
    // 1. Fetch all books in parallel
    const bookResults = await Promise.all(shelfBooks.map((sb) => ctx.db.get(sb.bookId)));
    const bookMap = new Map<string, Doc<"books">>();
    for (const book of bookResults) {
      if (book) bookMap.set(book._id, book);
    }

    // 2. Fetch bookAuthors for all books in parallel
    const validBookIds = [...bookMap.keys()] as Id<"books">[];
    const bookAuthorsByBook = await Promise.all(
      validBookIds.map((bookId) =>
        ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", bookId))
          .collect()
      )
    );

    // 3. Collect unique author IDs and series IDs
    const authorIds = new Set<Id<"authors">>();
    const seriesIds = new Set<Id<"series">>();
    for (const bas of bookAuthorsByBook) {
      for (const ba of bas) {
        authorIds.add(ba.authorId);
      }
    }
    for (const book of bookMap.values()) {
      if (book.seriesId) seriesIds.add(book.seriesId);
    }

    // 4. Batch-fetch all authors and series
    const [authorDocs, seriesDocs] = await Promise.all([
      Promise.all([...authorIds].map((id) => ctx.db.get(id))),
      Promise.all([...seriesIds].map((id) => ctx.db.get(id))),
    ]);

    const authorDocMap = new Map<string, Doc<"authors">>();
    for (const doc of authorDocs) {
      if (doc) authorDocMap.set(doc._id, doc);
    }
    const seriesDocMap = new Map<string, Doc<"series">>();
    for (const doc of seriesDocs) {
      if (doc) seriesDocMap.set(doc._id, doc);
    }

    // Build per-book lookup maps
    const bookAuthorsLookup = new Map<string, Doc<"bookAuthors">[]>();
    for (let i = 0; i < validBookIds.length; i++) {
      bookAuthorsLookup.set(validBookIds[i], bookAuthorsByBook[i]);
    }

    // 5. Assemble enriched books preserving shelf-specific fields
    const enrichedBooks = shelfBooks
      .map((sb) => {
        const book = bookMap.get(sb.bookId);
        if (!book) return null;

        const bas = bookAuthorsLookup.get(book._id) ?? [];
        const authors = bas
          .map((ba) => {
            const author = authorDocMap.get(ba.authorId);
            return author ? { _id: author._id, name: author.name, role: ba.role } : null;
          })
          .filter((a) => a !== null);

        const seriesDoc = book.seriesId ? (seriesDocMap.get(book.seriesId) ?? null) : null;

        return {
          ...book,
          shelfBookId: sb._id,
          position: sb.position,
          authors,
          series: seriesDoc ? { _id: seriesDoc._id, name: seriesDoc.name } : null,
        };
      })
      .filter((b) => b !== null);

    return {
      ...shelf,
      isOwner,
      owner: owner ? { _id: owner._id, name: owner.name, imageUrl: owner.imageUrl } : null,
      books: enrichedBooks,
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

// Get current user's shelves (for home screen / browse)
export const getMyShelves = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    const shelves = await ctx.db
      .query("shelves")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    const shelvesWithCounts = await Promise.all(
      shelves.map(async (shelf) => {
        const shelfBooks = await ctx.db
          .query("shelfBooks")
          .withIndex("by_shelf", (q) => q.eq("shelfId", shelf._id))
          .collect();

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

    shelvesWithCounts.sort((a, b) => b.updatedAt - a.updatedAt);

    return shelvesWithCounts;
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

export const getWantToReadStatus = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const result = await getWantToReadShelfBook(ctx, user._id, args.bookId);

    return {
      isOnWantToRead: result?.shelfBook !== null && result?.shelfBook !== undefined,
      shelfId: result?.shelf._id ?? null,
    };
  },
});
