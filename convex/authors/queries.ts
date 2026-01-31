import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";

// Get a single author by ID
export const getAuthor = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    const author = await ctx.db.get(args.authorId);
    return author;
  },
});

// List all authors with pagination (for infinite scroll)
export const listAuthors = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authors")
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

// Search authors by name
export const searchAuthors = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    const searchTerm = args.search.trim();

    if (searchTerm.length === 0) {
      return [];
    }

    const authors = await ctx.db
      .query("authors")
      .withSearchIndex("search_authors", (q) => q.search("name", searchTerm))
      .take(50);

    return authors;
  },
});

// Get books for an author
export const getAuthorBooks = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    // Get all book-author relationships for this author
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();

    // Fetch all books
    const books = await Promise.all(
      bookAuthors.map(async (ba) => {
        const book = await ctx.db.get(ba.bookId);
        return book ? { ...book, role: ba.role } : null;
      })
    );

    return books.filter((book) => book !== null);
  },
});

// Preview what will happen when deleting an author
export const getAuthorDeletionPreview = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    // Get all book-author relationships for this author
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_author", (q) => q.eq("authorId", args.authorId))
      .collect();

    const booksToDelete: Array<{ _id: string; title: string }> = [];
    const booksToKeep: Array<{
      _id: string;
      title: string;
      otherAuthors: string[];
    }> = [];

    for (const ba of bookAuthors) {
      const book = await ctx.db.get(ba.bookId);
      if (!book) continue;

      // Get all authors for this book
      const allBookAuthors = await ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", ba.bookId))
        .collect();

      // Get other authors (excluding the one being deleted)
      const otherAuthorIds = allBookAuthors
        .filter((a) => a.authorId !== args.authorId)
        .map((a) => a.authorId);

      if (otherAuthorIds.length === 0) {
        // This author is the only author - book will be deleted
        booksToDelete.push({ _id: book._id, title: book.title });
      } else {
        // Book has other authors - will be kept
        const otherAuthors = await Promise.all(
          otherAuthorIds.map(async (id) => {
            const author = await ctx.db.get(id);
            return author?.name || "Unknown";
          })
        );
        booksToKeep.push({
          _id: book._id,
          title: book.title,
          otherAuthors,
        });
      }
    }

    return {
      booksToDelete,
      booksToKeep,
      totalBooks: bookAuthors.length,
    };
  },
});
