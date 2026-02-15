import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";

import { query } from "../_generated/server";
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

// List all books with pagination, authors, and series (for infinite scroll)
export const listBooks = query({
  args: {
    paginationOpts: paginationOptsValidator,
    sort: v.optional(
      v.union(
        v.literal("title_asc"),
        v.literal("title_desc"),
        v.literal("recent"),
        v.literal("top_rated")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const sort = args.sort ?? "title_asc";
    let q;
    switch (sort) {
      case "title_desc":
        q = ctx.db.query("books").withIndex("by_title").order("desc");
        break;
      case "recent":
        q = ctx.db.query("books").order("desc");
        break;
      case "top_rated":
        q = ctx.db.query("books").withIndex("by_averageRating").order("desc");
        break;
      default:
        q = ctx.db.query("books").withIndex("by_title").order("asc");
        break;
    }
    const results = await q.paginate(args.paginationOpts);

    // Enrich with authors and series
    const booksWithDetails = await Promise.all(
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

        const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
          series: series ? { _id: series._id, name: series.name } : null,
        };
      })
    );

    return {
      ...results,
      page: booksWithDetails,
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

    // Also search series by name
    const matchingSeries = await ctx.db
      .query("series")
      .withSearchIndex("search_series", (q) => q.search("name", searchTerm))
      .take(10);

    // Get books from matching series
    const seriesBookArrays = await Promise.all(
      matchingSeries.map((s) =>
        ctx.db
          .query("books")
          .withIndex("by_series", (q) => q.eq("seriesId", s._id))
          .collect()
      )
    );
    const seriesBooks = seriesBookArrays.flat();

    // Merge and deduplicate (title results first for relevance)
    const seenIds = new Set(books.map((b) => b._id));
    const mergedBooks = [...books];
    for (const book of seriesBooks) {
      if (!seenIds.has(book._id)) {
        seenIds.add(book._id);
        mergedBooks.push(book);
      }
    }
    const cappedBooks = mergedBooks.slice(0, 50);

    // Enrich with authors and series
    const booksWithDetails = await Promise.all(
      cappedBooks.map(async (book) => {
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

        const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
          series: series ? { _id: series._id, name: series.name } : null,
        };
      })
    );

    return booksWithDetails;
  },
});

// Filter books by genres (non-paginated, like search)
export const filterBooksByGenres = query({
  args: {
    genreIds: v.array(v.id("genres")),
    sort: v.optional(
      v.union(
        v.literal("title_asc"),
        v.literal("title_desc"),
        v.literal("recent"),
        v.literal("top_rated")
      )
    ),
  },
  handler: async (ctx, args) => {
    await requireAuth(ctx);

    if (args.genreIds.length === 0) {
      return [];
    }

    // For each genre, get all bookIds that have votes for that genre
    const bookIdSets = await Promise.all(
      args.genreIds.map(async (genreId) => {
        const votes = await ctx.db
          .query("bookGenreVotes")
          .withIndex("by_genre", (q) => q.eq("genreId", genreId))
          .collect();
        return new Set(votes.map((v) => v.bookId));
      })
    );

    // Union all bookIds (OR logic)
    const allBookIds = new Set<(typeof bookIdSets)[number] extends Set<infer T> ? T : never>();
    for (const idSet of bookIdSets) {
      for (const id of idSet) {
        allBookIds.add(id);
      }
    }

    // Fetch books
    const books = (await Promise.all([...allBookIds].map((id) => ctx.db.get(id)))).filter(
      (b) => b !== null
    );

    // Sort in-memory
    const sort = args.sort ?? "title_asc";
    switch (sort) {
      case "title_desc":
        books.sort((a, b) => b.title.localeCompare(a.title));
        break;
      case "recent":
        books.sort((a, b) => b._creationTime - a._creationTime);
        break;
      case "top_rated":
        books.sort((a, b) => (b.averageRating ?? 0) - (a.averageRating ?? 0));
        break;
      default:
        books.sort((a, b) => a.title.localeCompare(b.title));
        break;
    }

    const capped = books.slice(0, 50);

    // Enrich with authors and series
    const booksWithDetails = await Promise.all(
      capped.map(async (book) => {
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

        const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
          series: series ? { _id: series._id, name: series.name } : null,
        };
      })
    );

    return booksWithDetails;
  },
});

// Get top-rated books (for home page)
export const getTopRatedBooks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 6;

    // Query by averageRating index descending, then filter to rated books
    const books = await ctx.db
      .query("books")
      .withIndex("by_averageRating")
      .order("desc")
      .filter((q) => q.gt(q.field("ratingCount"), 0))
      .take(limit);

    // Enrich with authors and series
    const booksWithDetails = await Promise.all(
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

        const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
          series: series ? { _id: series._id, name: series.name } : null,
        };
      })
    );

    return booksWithDetails;
  },
});

// Get aggregate library stats (for home page)
export const getHomeStats = query({
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    // Count all books
    const allBooks = await ctx.db.query("books").collect();
    const totalBooks = allBooks.length;

    // Count all authors
    const allAuthors = await ctx.db.query("authors").collect();
    const totalAuthors = allAuthors.length;

    // Sum positionSeconds from user's listeningProgress
    const progressRecords = await ctx.db
      .query("listeningProgress")
      .withIndex("by_user_and_lastListened", (q) => q.eq("userId", user._id))
      .collect();
    const totalListeningSeconds = progressRecords.reduce(
      (sum, record) => sum + record.positionSeconds,
      0
    );

    // Count books marked as read by current user
    const userData = await ctx.db
      .query("bookUserData")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
    const booksRead = userData.filter((d) => d.isRead).length;

    return { totalBooks, totalAuthors, totalListeningSeconds, booksRead };
  },
});

// Get recent books (for home page)
export const getRecentBooks = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAuth(ctx);
    const limit = args.limit ?? 6;
    const books = await ctx.db.query("books").order("desc").take(limit);

    // Enrich with authors and series
    const booksWithDetails = await Promise.all(
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

        const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

        return {
          ...book,
          authors: authors.filter((a) => a !== null),
          series: series ? { _id: series._id, name: series.name } : null,
        };
      })
    );

    return booksWithDetails;
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
