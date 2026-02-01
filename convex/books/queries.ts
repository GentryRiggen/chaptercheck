import { v } from "convex/values";
import { query } from "../_generated/server";
import { paginationOptsValidator } from "convex/server";
import { requireAuth } from "../lib/auth";

// Get a single book by ID with authors and series
export const getBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book) return null;

    // Get authors for this book
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    const authors = await Promise.all(
      bookAuthors.map(async (ba) => {
        const author = await ctx.db.get(ba.authorId);
        return author ? { ...author, role: ba.role } : null;
      })
    );

    // Get series if book is part of one
    const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

    return {
      ...book,
      authors: authors.filter((a) => a !== null),
      series,
    };
  },
});

// List all books with pagination and authors (for infinite scroll)
export const listBooks = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const results = await ctx.db
      .query("books")
      .order("desc")
      .paginate(args.paginationOpts);

    // Enrich with authors
    const booksWithAuthors = await Promise.all(
      results.page.map(async (book) => {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const authors = await Promise.all(
          bookAuthors.map(async (ba) => {
            const author = await ctx.db.get(ba.authorId);
            return author ? { ...author, role: ba.role } : null;
          })
        );

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
        };
      })
    );

    return {
      ...results,
      page: booksWithAuthors,
    };
  },
});

// Search books by title
export const searchBooks = query({
  args: { search: v.string() },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const searchTerm = args.search.trim();

    if (searchTerm.length === 0) {
      return [];
    }

    const books = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) => q.search("title", searchTerm))
      .take(50);

    // Enrich with authors
    const booksWithAuthors = await Promise.all(
      books.map(async (book) => {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const authors = await Promise.all(
          bookAuthors.map(async (ba) => {
            const author = await ctx.db.get(ba.authorId);
            return author ? { ...author, role: ba.role } : null;
          })
        );

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
        };
      })
    );

    return booksWithAuthors;
  },
});

// Get recent books (for home page)
export const getRecentBooks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 6;
    const books = await ctx.db.query("books").order("desc").take(limit);

    // Enrich with authors
    const booksWithAuthors = await Promise.all(
      books.map(async (book) => {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        const authors = await Promise.all(
          bookAuthors.map(async (ba) => {
            const author = await ctx.db.get(ba.authorId);
            return author ? { _id: author._id, name: author.name } : null;
          })
        );

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
        };
      })
    );

    return booksWithAuthors;
  },
});

// Preview what will happen when deleting a book
export const getBookDeletionPreview = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const book = await ctx.db.get(args.bookId);
    if (!book) return null;

    // Get audio files count
    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    // Get authors
    const bookAuthors = await ctx.db
      .query("bookAuthors")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    const authors = await Promise.all(
      bookAuthors.map(async (ba) => {
        const author = await ctx.db.get(ba.authorId);
        return author?.name || "Unknown";
      })
    );

    return {
      title: book.title,
      audioFilesCount: audioFiles.length,
      authors,
    };
  },
});
