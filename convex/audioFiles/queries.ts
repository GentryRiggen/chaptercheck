import { v } from "convex/values";

import { query } from "../_generated/server";
import { generateFriendlyFileName, generateHumanReadableName } from "../lib/audioFileNames";
import { requireAuth } from "../lib/auth";

// Get a single audio file by ID with friendly name (only if it belongs to the current user's storage account)
export const getAudioFile = query({
  args: { audioFileId: v.id("audioFiles") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    const audioFile = await ctx.db.get(args.audioFileId);
    if (!audioFile) {
      return null;
    }

    // For files with storageAccountId, verify user has access to that storage account
    if (audioFile.storageAccountId) {
      if (user.storageAccountId !== audioFile.storageAccountId) {
        return null;
      }
    } else {
      // Legacy files without storageAccountId - check uploadedBy
      if (audioFile.uploadedBy !== user._id) {
        return null;
      }
    }

    // Get book and series info for friendly name
    const book = await ctx.db.get(audioFile.bookId);
    if (!book) {
      return { ...audioFile, friendlyName: null, displayName: null };
    }

    const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;
    const partNumber = audioFile.partNumber ?? 1;

    const friendlyName = generateFriendlyFileName({
      bookTitle: book.title,
      seriesName: series?.name,
      seriesOrder: book.seriesOrder,
      partNumber,
      format: audioFile.format,
    });

    const displayName = generateHumanReadableName({
      bookTitle: book.title,
      seriesName: series?.name,
      seriesOrder: book.seriesOrder,
      partNumber,
    });

    return { ...audioFile, friendlyName, displayName };
  },
});

// Get all audio files for a book (filtered to current user's storage account)
// Returns files sorted by partNumber with friendly display names
export const getAudioFilesForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    // Get book and series info for friendly names
    const book = await ctx.db.get(args.bookId);
    if (!book) {
      return [];
    }
    const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;

    let audioFiles;

    if (user.storageAccountId) {
      // Query using the efficient composite index
      audioFiles = await ctx.db
        .query("audioFiles")
        .withIndex("by_storageAccount_and_book", (q) =>
          q.eq("storageAccountId", user.storageAccountId).eq("bookId", args.bookId)
        )
        .collect();
    } else {
      // Fallback for users without storage account - check legacy files by uploadedBy
      const allFiles = await ctx.db
        .query("audioFiles")
        .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
        .collect();

      // Filter to only return files uploaded by this user
      audioFiles = allFiles.filter((file) => file.uploadedBy === user._id);
    }

    // Sort by partNumber (null/undefined values go last)
    audioFiles.sort((a, b) => {
      const partA = a.partNumber ?? Infinity;
      const partB = b.partNumber ?? Infinity;
      return partA - partB;
    });

    // Add friendly names to each file
    return audioFiles.map((audioFile) => {
      const partNumber = audioFile.partNumber ?? 1;

      const friendlyName = generateFriendlyFileName({
        bookTitle: book.title,
        seriesName: series?.name,
        seriesOrder: book.seriesOrder,
        partNumber,
        format: audioFile.format,
      });

      const displayName = generateHumanReadableName({
        bookTitle: book.title,
        seriesName: series?.name,
        seriesOrder: book.seriesOrder,
        partNumber,
      });

      return { ...audioFile, friendlyName, displayName };
    });
  },
});

// Get all audio files for the current user (across all books)
export const getMyAudioFiles = query({
  args: {},
  handler: async (ctx) => {
    const { user } = await requireAuth(ctx);

    let audioFiles;

    if (user.storageAccountId) {
      audioFiles = await ctx.db
        .query("audioFiles")
        .withIndex("by_storageAccount", (q) => q.eq("storageAccountId", user.storageAccountId))
        .order("desc")
        .collect();
    } else {
      // Fallback for users without storage account
      audioFiles = await ctx.db
        .query("audioFiles")
        .withIndex("by_uploadedBy", (q) => q.eq("uploadedBy", user._id))
        .order("desc")
        .collect();
    }

    // Fetch book/series info and add friendly names
    const filesWithNames = await Promise.all(
      audioFiles.map(async (audioFile) => {
        const book = await ctx.db.get(audioFile.bookId);
        if (!book) {
          return { ...audioFile, friendlyName: null, displayName: null };
        }

        const series = book.seriesId ? await ctx.db.get(book.seriesId) : null;
        const partNumber = audioFile.partNumber ?? 1;

        const friendlyName = generateFriendlyFileName({
          bookTitle: book.title,
          seriesName: series?.name,
          seriesOrder: book.seriesOrder,
          partNumber,
          format: audioFile.format,
        });

        const displayName = generateHumanReadableName({
          bookTitle: book.title,
          seriesName: series?.name,
          seriesOrder: book.seriesOrder,
          partNumber,
        });

        return { ...audioFile, friendlyName, displayName };
      })
    );

    return filesWithNames;
  },
});

// Get count of audio files for a book (for determining next part number)
export const getAudioFileCountForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const { user } = await requireAuth(ctx);

    if (user.storageAccountId) {
      const audioFiles = await ctx.db
        .query("audioFiles")
        .withIndex("by_storageAccount_and_book", (q) =>
          q.eq("storageAccountId", user.storageAccountId).eq("bookId", args.bookId)
        )
        .collect();

      return audioFiles.length;
    }

    // Fallback for users without storage account
    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .collect();

    return audioFiles.filter((file) => file.uploadedBy === user._id).length;
  },
});
