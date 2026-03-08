import { v } from "convex/values";

import { type Doc, type Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";

const NOTE_TEXT_MAX_LENGTH = 4000;
const MAX_NOTE_RANGE_SECONDS = 30 * 60;

function normalizeNoteText(noteText?: string) {
  if (noteText === undefined) return undefined;
  const trimmed = noteText.trim();
  if (!trimmed) {
    return undefined;
  }
  if (trimmed.length > NOTE_TEXT_MAX_LENGTH) {
    throw new Error(`Note text must be ${NOTE_TEXT_MAX_LENGTH} characters or fewer`);
  }
  return trimmed;
}

async function validateCategoryOwnership(
  ctx: MutationCtx,
  userId: Id<"users">,
  categoryId?: Id<"noteCategories">
) {
  if (!categoryId) return null;
  const category = await ctx.db.get(categoryId);
  if (!category || category.userId !== userId) {
    throw new Error("Category not found");
  }
  return category;
}

async function validateNoteRange(
  ctx: MutationCtx,
  bookId: Id<"books">,
  audioFileId: Id<"audioFiles">,
  startSeconds: number,
  endSeconds: number
) {
  const audioFile = await ctx.db.get(audioFileId);
  if (!audioFile || audioFile.bookId !== bookId) {
    throw new Error("Audio file does not belong to the specified book");
  }

  const clampedStart = Math.max(0, startSeconds);
  let clampedEnd = Math.max(0, endSeconds);

  if (audioFile.duration > 0) {
    clampedEnd = Math.min(clampedEnd, audioFile.duration);
  }

  if (clampedStart >= clampedEnd) {
    throw new Error("Start time must be before end time");
  }

  if (clampedEnd - clampedStart > MAX_NOTE_RANGE_SECONDS) {
    throw new Error("Notes cannot be longer than 30 minutes");
  }

  return {
    audioFile,
    startSeconds: clampedStart,
    endSeconds: clampedEnd,
  };
}

async function getOwnedNoteOrThrow(
  ctx: MutationCtx,
  noteId: Id<"bookNotes">,
  userId: Id<"users">
): Promise<Doc<"bookNotes">> {
  const note = await ctx.db.get(noteId);
  if (!note || note.userId !== userId) {
    throw new Error("Note not found");
  }
  return note;
}

export const createCategory = mutation({
  args: {
    name: v.string(),
    colorToken: v.string(),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const now = Date.now();
    const name = args.name.trim();

    if (!name) {
      throw new Error("Category name is required");
    }

    const existing = await ctx.db
      .query("noteCategories")
      .withIndex("by_user_and_name", (q) => q.eq("userId", user._id).eq("name", name))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        colorToken: args.colorToken,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("noteCategories", {
      userId: user._id,
      name,
      colorToken: args.colorToken,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const createNote = mutation({
  args: {
    bookId: v.id("books"),
    audioFileId: v.id("audioFiles"),
    categoryId: v.optional(v.id("noteCategories")),
    startSeconds: v.number(),
    endSeconds: v.number(),
    noteText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const now = Date.now();

    const category = await validateCategoryOwnership(ctx, user._id, args.categoryId);
    const range = await validateNoteRange(
      ctx,
      args.bookId,
      args.audioFileId,
      args.startSeconds,
      args.endSeconds
    );

    const noteId = await ctx.db.insert("bookNotes", {
      userId: user._id,
      bookId: args.bookId,
      audioFileId: range.audioFile._id,
      categoryId: args.categoryId,
      startSeconds: range.startSeconds,
      endSeconds: range.endSeconds,
      noteText: normalizeNoteText(args.noteText),
      createdAt: now,
      updatedAt: now,
    });

    if (category) {
      await ctx.db.patch(category._id, { updatedAt: now });
    }

    return noteId;
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("bookNotes"),
    audioFileId: v.id("audioFiles"),
    categoryId: v.optional(v.id("noteCategories")),
    startSeconds: v.number(),
    endSeconds: v.number(),
    noteText: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const note = await getOwnedNoteOrThrow(ctx, args.noteId, user._id);
    const now = Date.now();

    const category = await validateCategoryOwnership(ctx, user._id, args.categoryId);
    const range = await validateNoteRange(
      ctx,
      note.bookId,
      args.audioFileId,
      args.startSeconds,
      args.endSeconds
    );

    await ctx.db.patch(note._id, {
      audioFileId: range.audioFile._id,
      categoryId: args.categoryId,
      startSeconds: range.startSeconds,
      endSeconds: range.endSeconds,
      noteText: normalizeNoteText(args.noteText),
      updatedAt: now,
    });

    if (category) {
      await ctx.db.patch(category._id, { updatedAt: now });
    }

    return note._id;
  },
});

export const deleteNote = mutation({
  args: {
    noteId: v.id("bookNotes"),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const note = await getOwnedNoteOrThrow(ctx, args.noteId, user._id);
    await ctx.db.delete(note._id);
    return { success: true };
  },
});
