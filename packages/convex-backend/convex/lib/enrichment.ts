import { type Doc, type Id } from "../_generated/dataModel";
import { type QueryCtx } from "../_generated/server";

/**
 * Batch enrichment utilities for Convex queries.
 *
 * These helpers replace the common N+1 pattern of enriching each item in a
 * loop with sequential DB reads. Instead they:
 *   1. Fetch all join-table rows in parallel (one indexed query per item).
 *   2. Collect unique foreign-key IDs.
 *   3. Batch-fetch all referenced docs in a single Promise.all.
 *   4. Assemble results from lookup maps.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type EnrichedBook = Doc<"books"> & {
  authors: Array<Doc<"authors"> & { role?: string }>;
  series: { _id: Doc<"series">["_id"]; name: string } | null;
};

export type LightweightAuthor = {
  _id: Id<"authors">;
  name: string;
  role?: string;
};

export type LightweightEnrichedBook = Doc<"books"> & {
  authors: LightweightAuthor[];
  series: { _id: Id<"series">; name: string } | null;
};

export type EnrichedAuthor = Doc<"authors"> & {
  bookCount: number;
  seriesCount: number;
};

// ---------------------------------------------------------------------------
// batchEnrichBooks — full author docs
// ---------------------------------------------------------------------------

export async function batchEnrichBooks(
  ctx: QueryCtx,
  books: Doc<"books">[]
): Promise<EnrichedBook[]> {
  if (books.length === 0) return [];

  // 1. Fetch all bookAuthor join rows in parallel
  const bookAuthorsByBook = await Promise.all(
    books.map((book) =>
      ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .collect()
    )
  );

  // 2. Collect unique author IDs and series IDs
  const authorIds = new Set<Id<"authors">>();
  const seriesIds = new Set<Id<"series">>();

  for (const bas of bookAuthorsByBook) {
    for (const ba of bas) {
      authorIds.add(ba.authorId);
    }
  }
  for (const book of books) {
    if (book.seriesId) {
      seriesIds.add(book.seriesId);
    }
  }

  // 3. Batch-fetch all authors and series in parallel
  const [authorDocs, seriesDocs] = await Promise.all([
    Promise.all([...authorIds].map((id) => ctx.db.get(id))),
    Promise.all([...seriesIds].map((id) => ctx.db.get(id))),
  ]);

  const authorMap = new Map<string, Doc<"authors">>();
  for (const doc of authorDocs) {
    if (doc) authorMap.set(doc._id, doc);
  }

  const seriesMap = new Map<string, Doc<"series">>();
  for (const doc of seriesDocs) {
    if (doc) seriesMap.set(doc._id, doc);
  }

  // 4. Assemble results
  return books.map((book, i) => {
    const bas = bookAuthorsByBook[i];
    const authors: Array<Doc<"authors"> & { role?: string }> = [];
    for (const ba of bas) {
      const author = authorMap.get(ba.authorId);
      if (author) {
        authors.push({ ...author, role: ba.role });
      }
    }

    const seriesDoc = book.seriesId ? seriesMap.get(book.seriesId) : null;

    return {
      ...book,
      authors,
      series: seriesDoc ? { _id: seriesDoc._id, name: seriesDoc.name } : null,
    };
  });
}

// ---------------------------------------------------------------------------
// batchEnrichBooksLightweight — lightweight author shape for list views
// ---------------------------------------------------------------------------

export async function batchEnrichBooksLightweight(
  ctx: QueryCtx,
  books: Doc<"books">[]
): Promise<LightweightEnrichedBook[]> {
  if (books.length === 0) return [];

  // 1. Fetch all bookAuthor join rows in parallel
  const bookAuthorsByBook = await Promise.all(
    books.map((book) =>
      ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .collect()
    )
  );

  // 2. Collect unique IDs
  const authorIds = new Set<Id<"authors">>();
  const seriesIds = new Set<Id<"series">>();

  for (const bas of bookAuthorsByBook) {
    for (const ba of bas) {
      authorIds.add(ba.authorId);
    }
  }
  for (const book of books) {
    if (book.seriesId) {
      seriesIds.add(book.seriesId);
    }
  }

  // 3. Batch-fetch
  const [authorDocs, seriesDocs] = await Promise.all([
    Promise.all([...authorIds].map((id) => ctx.db.get(id))),
    Promise.all([...seriesIds].map((id) => ctx.db.get(id))),
  ]);

  const authorMap = new Map<string, Doc<"authors">>();
  for (const doc of authorDocs) {
    if (doc) authorMap.set(doc._id, doc);
  }

  const seriesMap = new Map<string, Doc<"series">>();
  for (const doc of seriesDocs) {
    if (doc) seriesMap.set(doc._id, doc);
  }

  // 4. Assemble
  return books.map((book, i) => {
    const bas = bookAuthorsByBook[i];
    const authors: LightweightAuthor[] = [];
    for (const ba of bas) {
      const author = authorMap.get(ba.authorId);
      if (author) {
        authors.push({ _id: author._id, name: author.name, role: ba.role });
      }
    }

    const seriesDoc = book.seriesId ? seriesMap.get(book.seriesId) : null;

    return {
      ...book,
      authors,
      series: seriesDoc ? { _id: seriesDoc._id, name: seriesDoc.name } : null,
    };
  });
}

// ---------------------------------------------------------------------------
// batchEnrichAuthors — bookCount + seriesCount
// ---------------------------------------------------------------------------

export async function batchEnrichAuthors(
  ctx: QueryCtx,
  authors: Doc<"authors">[]
): Promise<EnrichedAuthor[]> {
  if (authors.length === 0) return [];

  // 1. Fetch all bookAuthor join rows per author in parallel
  const bookAuthorsByAuthor = await Promise.all(
    authors.map((author) =>
      ctx.db
        .query("bookAuthors")
        .withIndex("by_author", (q) => q.eq("authorId", author._id))
        .collect()
    )
  );

  // 2. Collect all unique bookIds
  const allBookIds = new Set<Id<"books">>();
  for (const bas of bookAuthorsByAuthor) {
    for (const ba of bas) {
      allBookIds.add(ba.bookId);
    }
  }

  // 3. Batch-fetch all book docs
  const bookDocs = await Promise.all([...allBookIds].map((id) => ctx.db.get(id)));
  const bookMap = new Map<string, Doc<"books">>();
  for (const doc of bookDocs) {
    if (doc) bookMap.set(doc._id, doc);
  }

  // 4. Assemble counts
  return authors.map((author, i) => {
    const bas = bookAuthorsByAuthor[i];
    const seriesIds = new Set<string>();
    for (const ba of bas) {
      const book = bookMap.get(ba.bookId);
      if (book?.seriesId) {
        seriesIds.add(book.seriesId);
      }
    }

    return {
      ...author,
      bookCount: bas.length,
      seriesCount: seriesIds.size,
    };
  });
}
