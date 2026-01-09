import { v } from "convex/values";
import { query } from "../_generated/server";

// Get a single author by ID
export const getAuthor = query({
  args: { authorId: v.id("authors") },
  handler: async (ctx, args) => {
    const author = await ctx.db.get(args.authorId);
    return author;
  },
});

// List all authors with pagination
export const listAuthors = query({
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
      .query("authors")
      .order("desc")
      .paginate(args.paginationOpts || { numItems: 20, cursor: null });

    return results;
  },
});

// Search authors by name
export const searchAuthors = query({
  args: { searchQuery: v.string() },
  handler: async (ctx, args) => {
    if (!args.searchQuery || args.searchQuery.trim().length === 0) {
      // Return recent authors if no search query
      return await ctx.db.query("authors").order("desc").take(20);
    }

    const authors = await ctx.db
      .query("authors")
      .withSearchIndex("search_authors", (q) =>
        q.search("name", args.searchQuery)
      )
      .take(20);

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
