import { v } from "convex/values";
import { query } from "../_generated/server";

// Get a single audio file by ID
export const getAudioFile = query({
  args: { audioFileId: v.id("audioFiles") },
  handler: async (ctx, args) => {
    const audioFile = await ctx.db.get(args.audioFileId);
    return audioFile;
  },
});

// Get all audio files for a book
export const getAudioFilesForBook = query({
  args: { bookId: v.id("books") },
  handler: async (ctx, args) => {
    const audioFiles = await ctx.db
      .query("audioFiles")
      .withIndex("by_book", (q) => q.eq("bookId", args.bookId))
      .order("asc")
      .collect();

    return audioFiles;
  },
});
