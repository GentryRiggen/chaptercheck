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

// Find all books that have zero audio files
export const findBooksWithoutAudio = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allBooks = await ctx.db.query("books").collect();
    const results: { _id: (typeof allBooks)[0]["_id"]; title: string; authorIds: string[] }[] = [];

    for (const book of allBooks) {
      const audioFile = await ctx.db
        .query("audioFiles")
        .withIndex("by_book", (q) => q.eq("bookId", book._id))
        .first();

      if (!audioFile) {
        const bookAuthors = await ctx.db
          .query("bookAuthors")
          .withIndex("by_book", (q) => q.eq("bookId", book._id))
          .collect();

        results.push({
          _id: book._id,
          title: book.title,
          authorIds: bookAuthors.map((ba) => ba.authorId),
        });
      }
    }

    return results;
  },
});

// Delete indexed related data (bookAuthors, shelfBooks, genreVotes, bookUserData) + the book
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

// Delete listeningProgress for a set of book IDs (no by_book index, requires scan)
export const deleteListeningProgressForBooks = internalMutation({
  args: { bookIds: v.array(v.id("books")) },
  handler: async (ctx, args) => {
    const bookIdSet = new Set<string>(args.bookIds);
    const allProgress = await ctx.db.query("listeningProgress").collect();
    let deleted = 0;

    for (const progress of allProgress) {
      if (bookIdSet.has(progress.bookId)) {
        await ctx.db.delete(progress._id);
        deleted++;
      }
    }

    return { deleted };
  },
});

// Delete bookNotes + their bookNoteTags for a set of book IDs (no by_book index, requires scan)
export const deleteBookNotesForBooks = internalMutation({
  args: { bookIds: v.array(v.id("books")) },
  handler: async (ctx, args) => {
    const bookIdSet = new Set<string>(args.bookIds);
    const allNotes = await ctx.db.query("bookNotes").collect();
    let notesDeleted = 0;
    let tagsDeleted = 0;

    for (const note of allNotes) {
      if (bookIdSet.has(note.bookId)) {
        // Delete tags for this note first
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

    return { notesDeleted, tagsDeleted };
  },
});

// Find authors with no remaining bookAuthors entries
export const findOrphanedAuthors = internalMutation({
  args: {},
  handler: async (ctx) => {
    const allAuthors = await ctx.db.query("authors").collect();
    const orphaned: { _id: (typeof allAuthors)[0]["_id"]; name: string }[] = [];

    for (const author of allAuthors) {
      const bookAuthor = await ctx.db
        .query("bookAuthors")
        .withIndex("by_author", (q) => q.eq("authorId", author._id))
        .first();

      if (!bookAuthor) {
        orphaned.push({ _id: author._id, name: author.name });
      }
    }

    return orphaned;
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
    // Step 1: Find books without audio files
    const booksWithoutAudio: { _id: Id<"books">; title: string; authorIds: string[] }[] =
      await ctx.runMutation(internal.cleanup.deleteOrphanedBooks.findBooksWithoutAudio, {});

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

    // Step 2: Delete related data that requires full table scans
    console.log(`\nDeleting related data...`);

    const progressResult = await ctx.runMutation(
      internal.cleanup.deleteOrphanedBooks.deleteListeningProgressForBooks,
      { bookIds }
    );
    console.log(`  Listening progress: ${progressResult.deleted} deleted`);

    const notesResult = await ctx.runMutation(
      internal.cleanup.deleteOrphanedBooks.deleteBookNotesForBooks,
      { bookIds }
    );
    console.log(
      `  Book notes: ${notesResult.notesDeleted} deleted, tags: ${notesResult.tagsDeleted} deleted`
    );

    // Step 3: Delete books + indexed related data in batches
    const BATCH = 25;
    let booksDeleted = 0;

    for (let i = 0; i < bookIds.length; i += BATCH) {
      const batch = bookIds.slice(i, i + BATCH);
      const result = await ctx.runMutation(internal.cleanup.deleteOrphanedBooks.deleteBooksBatch, {
        bookIds: batch,
      });
      booksDeleted += batch.length;
      console.log(
        `  Book batch ${Math.floor(i / BATCH) + 1}: ${batch.length} books (${result.totalDeleted} total records)`
      );
    }

    // Step 4: Find and delete orphaned authors
    console.log(`\nChecking for orphaned authors...`);
    const orphanedAuthors: { _id: Id<"authors">; name: string }[] = await ctx.runMutation(
      internal.cleanup.deleteOrphanedBooks.findOrphanedAuthors,
      {}
    );

    console.log(`Found ${orphanedAuthors.length} orphaned author(s):`);
    for (const author of orphanedAuthors) {
      console.log(`  - "${author.name}" (${author._id})`);
    }

    let authorsDeleted = 0;
    if (orphanedAuthors.length > 0) {
      const authorIds = orphanedAuthors.map((a) => a._id);
      for (let i = 0; i < authorIds.length; i += BATCH) {
        const batch = authorIds.slice(i, i + BATCH);
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
