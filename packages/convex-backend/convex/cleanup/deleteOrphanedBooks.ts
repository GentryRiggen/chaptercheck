import { v } from "convex/values";

import { internal } from "../_generated/api";
import { type Id } from "../_generated/dataModel";
import { internalAction, internalMutation } from "../_generated/server";

/**
 * One-off cleanup script: delete books without audio files, then delete
 * authors who no longer have any books.
 *
 * Run from the Convex dashboard:
 *   1. Dry run:  cleanup/deleteOrphanedBooks:run  { "dryRun": true }
 *   2. Execute:  cleanup/deleteOrphanedBooks:run  { "dryRun": false }
 */

const PAGE_SIZE = 500;
const DELETE_BATCH = 10;

// Paginated scan: find books without audio files, one page at a time
export const findBooksWithoutAudioPage = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("books")
      .paginate({ numItems: PAGE_SIZE, cursor: args.cursor ?? null });

    const booksWithoutAudio: { _id: Id<"books">; title: string }[] = [];

    for (const book of result.page) {
      const audioFile = await ctx.db
        .query("audioFiles")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .first();

      if (!audioFile) {
        booksWithoutAudio.push({ _id: book._id, title: book.title });
      }
    }

    return {
      booksWithoutAudio,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

// Delete indexed related data + the book itself for a small batch
export const deleteBooksBatch = internalMutation({
  args: { bookIds: v.array(v.id("books")) },
  handler: async (ctx, args) => {
    let totalDeleted = 0;

    for (const bookId of args.bookIds) {
      // bookAuthors
      const bookAuthors = await ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .collect();
      for (const ba of bookAuthors) {
        await ctx.db.delete(ba._id);
        totalDeleted++;
      }

      // shelfBooks
      const shelfBooks = await ctx.db
        .query("shelfBooks")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .collect();
      for (const sb of shelfBooks) {
        await ctx.db.delete(sb._id);
        totalDeleted++;
      }

      // bookGenreVotes
      const genreVotes = await ctx.db
        .query("bookGenreVotes")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .collect();
      for (const gv of genreVotes) {
        await ctx.db.delete(gv._id);
        totalDeleted++;
      }

      // bookUserData
      const userData = await ctx.db
        .query("bookUserData")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .collect();
      for (const ud of userData) {
        await ctx.db.delete(ud._id);
        totalDeleted++;
      }

      // Delete the book itself
      await ctx.db.delete(bookId);
      totalDeleted++;
    }

    return { totalDeleted };
  },
});

// Paginated scan + delete of listeningProgress matching any of the given bookIds
export const deleteListeningProgressPage = internalMutation({
  args: {
    bookIds: v.array(v.id("books")),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bookIdSet = new Set<string>(args.bookIds);
    const result = await ctx.db
      .query("listeningProgress")
      .paginate({ numItems: PAGE_SIZE, cursor: args.cursor ?? null });

    let deleted = 0;
    for (const progress of result.page) {
      if (bookIdSet.has(progress.bookId)) {
        await ctx.db.delete(progress._id);
        deleted++;
      }
    }

    return { deleted, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

// Paginated scan + delete of bookNotes (and their tags) matching any of the given bookIds
export const deleteBookNotesPage = internalMutation({
  args: {
    bookIds: v.array(v.id("books")),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const bookIdSet = new Set<string>(args.bookIds);
    const result = await ctx.db
      .query("bookNotes")
      .paginate({ numItems: PAGE_SIZE, cursor: args.cursor ?? null });

    let notesDeleted = 0;
    let tagsDeleted = 0;

    for (const note of result.page) {
      if (bookIdSet.has(note.bookId)) {
        const tags = await ctx.db
          .query("bookNoteTags")
          .withIndex("by_note", (q) => q.eq("noteId", note._id))
          .collect();
        for (const tag of tags) {
          await ctx.db.delete(tag._id);
          tagsDeleted++;
        }
        await ctx.db.delete(note._id);
        notesDeleted++;
      }
    }

    return {
      notesDeleted,
      tagsDeleted,
      isDone: result.isDone,
      continueCursor: result.continueCursor,
    };
  },
});

// Paginated scan: find authors with no remaining bookAuthors entries
export const findOrphanedAuthorsPage = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("authors")
      .paginate({ numItems: PAGE_SIZE, cursor: args.cursor ?? null });

    const orphaned: { _id: Id<"authors">; name: string }[] = [];

    for (const author of result.page) {
      const bookAuthor = await ctx.db
        .query("bookAuthors")
        .withIndex("by_author", (q) => q.eq("authorId", author._id))
        .first();

      if (!bookAuthor) {
        orphaned.push({ _id: author._id, name: author.name });
      }
    }

    return { orphaned, isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

// Delete a batch of authors
export const deleteAuthorsBatch = internalMutation({
  args: { authorIds: v.array(v.id("authors")) },
  handler: async (ctx, args) => {
    for (const authorId of args.authorIds) {
      await ctx.db.delete(authorId);
    }
    return { deleted: args.authorIds.length };
  },
});

// Main orchestrator
export const run = internalAction({
  args: { dryRun: v.boolean() },
  handler: async (ctx, args): Promise<Record<string, unknown>> => {
    // Step 1: Find all books without audio files (paginated)
    const booksWithoutAudio: { _id: Id<"books">; title: string }[] = [];
    let cursor: string | undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page: {
        booksWithoutAudio: { _id: Id<"books">; title: string }[];
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runMutation(internal.cleanup.deleteOrphanedBooks.findBooksWithoutAudioPage, {
        cursor,
      });
      booksWithoutAudio.push(...page.booksWithoutAudio);
      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    console.log(`\n========================================`);
    console.log(`CLEANUP: Books without audio files`);
    console.log(`========================================`);
    console.log(`Found ${booksWithoutAudio.length} book(s) without audio files:\n`);

    for (const book of booksWithoutAudio) {
      console.log(`  - "${book.title}" (${book._id})`);
    }

    if (booksWithoutAudio.length === 0) {
      console.log(`\nNothing to clean up.`);
      return { booksDeleted: 0, authorsDeleted: 0 };
    }

    if (args.dryRun) {
      console.log(`\n--- DRY RUN — no changes made ---\n`);
      return { booksToDelete: booksWithoutAudio.length, dryRun: true };
    }

    const bookIds = booksWithoutAudio.map((b) => b._id);

    // Step 2: Delete listeningProgress (paginated scan)
    console.log(`\nDeleting related data...`);
    let totalProgressDeleted = 0;
    cursor = undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result: { deleted: number; isDone: boolean; continueCursor: string } =
        await ctx.runMutation(internal.cleanup.deleteOrphanedBooks.deleteListeningProgressPage, {
          bookIds,
          cursor,
        });
      totalProgressDeleted += result.deleted;
      if (result.isDone) break;
      cursor = result.continueCursor;
    }
    console.log(`  Listening progress: ${totalProgressDeleted} deleted`);

    // Step 3: Delete bookNotes + tags (paginated scan)
    let totalNotesDeleted = 0;
    let totalTagsDeleted = 0;
    cursor = undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result: {
        notesDeleted: number;
        tagsDeleted: number;
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runMutation(internal.cleanup.deleteOrphanedBooks.deleteBookNotesPage, {
        bookIds,
        cursor,
      });
      totalNotesDeleted += result.notesDeleted;
      totalTagsDeleted += result.tagsDeleted;
      if (result.isDone) break;
      cursor = result.continueCursor;
    }
    console.log(`  Book notes: ${totalNotesDeleted} deleted, tags: ${totalTagsDeleted} deleted`);

    // Step 4: Delete books + indexed related data in batches
    let booksDeleted = 0;

    for (let i = 0; i < bookIds.length; i += DELETE_BATCH) {
      const batch = bookIds.slice(i, i + DELETE_BATCH);
      const result = await ctx.runMutation(internal.cleanup.deleteOrphanedBooks.deleteBooksBatch, {
        bookIds: batch,
      });
      booksDeleted += batch.length;
      console.log(
        `  Book batch ${Math.floor(i / DELETE_BATCH) + 1}: ${batch.length} books (${result.totalDeleted} total records)`
      );
    }

    // Step 5: Find and delete orphaned authors (paginated)
    console.log(`\nChecking for orphaned authors...`);
    const orphanedAuthors: { _id: Id<"authors">; name: string }[] = [];
    cursor = undefined;

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const page: {
        orphaned: { _id: Id<"authors">; name: string }[];
        isDone: boolean;
        continueCursor: string;
      } = await ctx.runMutation(internal.cleanup.deleteOrphanedBooks.findOrphanedAuthorsPage, {
        cursor,
      });
      orphanedAuthors.push(...page.orphaned);
      if (page.isDone) break;
      cursor = page.continueCursor;
    }

    console.log(`Found ${orphanedAuthors.length} orphaned author(s):`);
    for (const author of orphanedAuthors) {
      console.log(`  - "${author.name}" (${author._id})`);
    }

    let authorsDeleted = 0;
    if (orphanedAuthors.length > 0) {
      const authorIds = orphanedAuthors.map((a) => a._id);
      for (let i = 0; i < authorIds.length; i += DELETE_BATCH) {
        const batch = authorIds.slice(i, i + DELETE_BATCH);
        await ctx.runMutation(internal.cleanup.deleteOrphanedBooks.deleteAuthorsBatch, {
          authorIds: batch,
        });
        authorsDeleted += batch.length;
      }
    }

    console.log(`\n========================================`);
    console.log(`CLEANUP COMPLETE`);
    console.log(`  Books deleted: ${booksDeleted}`);
    console.log(`  Authors deleted: ${authorsDeleted}`);
    console.log(`========================================\n`);

    return { booksDeleted, authorsDeleted };
  },
});
