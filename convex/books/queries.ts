import { v } from "convex/values";
import { query } from "../_generated/server";

// Get a single book by ID with authors and series
export const getBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
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

// List all books with pagination and authors
export const listBooks = query({
  args: {
    paginationOpts: v.optional(
      v.object({
        numItems: v.number(),
        cursor: v.union(v.string(), v.null()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("books")
      .order("desc")
      .paginate(args.paginationOpts || { numItems: 20, cursor: null });

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
  args: { searchQuery: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchQuery || args.searchQuery.trim().length === 0) {
      // Return recent books if no search query
      const recentBooks = await ctx.db.query("books").order("desc").take(20);

      // Enrich with authors
      return await Promise.all(
        recentBooks.map(async (book) => {
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
    }

    const books = await ctx.db
      .query("books")
      .withSearchIndex("search_books", (q) =>
        q.search("title", args.searchQuery)
      )
      .take(20);

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
