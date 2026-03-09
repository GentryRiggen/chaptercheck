import { v } from "convex/values";

import { type Doc, type Id } from "../_generated/dataModel";
import { mutation, type MutationCtx } from "../_generated/server";
import { requireAuthMutation } from "../lib/auth";
import { getOrCreateMemoryTag } from "../lib/memoryTags";

const NOTE_TEXT_MAX_LENGTH = 4000;
const MAX_NOTE_RANGE_SECONDS = 30 * 60;

function normalizeOptionalText(value?: string) {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  if (trimmed.length > NOTE_TEXT_MAX_LENGTH) {
    throw new Error(`Text must be ${NOTE_TEXT_MAX_LENGTH} characters or fewer`);
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

async function validateOwnedTagIds(
  ctx: MutationCtx,
  userId: Id<"users">,
  tagIds: Id<"memoryTags">[]
) {
  const uniqueIds = [...new Set(tagIds.map(String))] as string[];
  const tags = await Promise.all(uniqueIds.map((tagId) => ctx.db.get(tagId as Id<"memoryTags">)));
  const ownedTags = tags.filter(
    (tag): tag is Doc<"memoryTags"> => tag !== null && tag.userId === userId
  );

  if (ownedTags.length !== uniqueIds.length) {
    throw new Error("One or more tags were not found");
  }

  return ownedTags;
}

async function validateOptionalAudioContext(
  ctx: MutationCtx,
  bookId: Id<"books">,
  audioFileId: Id<"audioFiles"> | undefined,
  startSeconds: number | undefined,
  endSeconds: number | undefined
) {
  const hasAnyAudioContext =
    audioFileId !== undefined || startSeconds !== undefined || endSeconds !== undefined;

  if (!hasAnyAudioContext) {
    return {
      audioFileId: undefined,
      startSeconds: undefined,
      endSeconds: undefined,
    };
  }

  if (audioFileId === undefined || startSeconds === undefined || endSeconds === undefined) {
    throw new Error("Audio note context requires audio file, start time, and end time");
  }

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
    audioFileId: audioFile._id,
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

async function upsertNoteTags(
  ctx: MutationCtx,
  noteId: Id<"bookNotes">,
  userId: Id<"users">,
  tagIds: Id<"memoryTags">[]
) {
  const existing = await ctx.db
    .query("bookNoteTags")
    .withIndex("by_note", (q) => q.eq("noteId", noteId))
    .collect();

  const nextIds = new Set(tagIds.map(String));
  const now = Date.now();

  await Promise.all(
    existing.filter((row) => !nextIds.has(String(row.tagId))).map((row) => ctx.db.delete(row._id))
  );

  const existingIds = new Set(existing.map((row) => String(row.tagId)));
  await Promise.all(
    tagIds
      .filter((tagId) => !existingIds.has(String(tagId)))
      .map((tagId) =>
        ctx.db.insert("bookNoteTags", {
          noteId,
          tagId,
          userId,
          createdAt: now,
        })
      )
  );
}

async function getLegacyCategoryTagId(
  ctx: MutationCtx,
  userId: Id<"users">,
  categoryId?: Id<"noteCategories">
) {
  const category = await validateCategoryOwnership(ctx, userId, categoryId);
  if (!category) return null;
  return await getOrCreateMemoryTag(ctx, userId, category.name);
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

    let categoryId: Id<"noteCategories">;
    if (existing) {
      await ctx.db.patch(existing._id, {
        colorToken: args.colorToken,
        updatedAt: now,
      });
      categoryId = existing._id;
    } else {
      categoryId = await ctx.db.insert("noteCategories", {
        userId: user._id,
        name,
        colorToken: args.colorToken,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Mirror legacy categories into the new tag system during compatibility mode.
    await getOrCreateMemoryTag(ctx, user._id, name);
    return categoryId;
  },
});

export const createTag = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    return await getOrCreateMemoryTag(ctx, user._id, args.name);
  },
});

export const createNote = mutation({
  args: {
    bookId: v.id("books"),
    entryType: v.optional(
      v.union(
        v.literal("note"),
        v.literal("quote"),
        v.literal("takeaway"),
        v.literal("theme"),
        v.literal("character"),
        v.literal("discussion_prompt")
      )
    ),
    audioFileId: v.optional(v.id("audioFiles")),
    categoryId: v.optional(v.id("noteCategories")),
    startSeconds: v.optional(v.number()),
    endSeconds: v.optional(v.number()),
    noteText: v.optional(v.string()),
    sourceText: v.optional(v.string()),
    tagIds: v.optional(v.array(v.id("memoryTags"))),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const now = Date.now();

    const audioContext = await validateOptionalAudioContext(
      ctx,
      args.bookId,
      args.audioFileId,
      args.startSeconds,
      args.endSeconds
    );

    const ownedTags = await validateOwnedTagIds(ctx, user._id, args.tagIds ?? []);
    const legacyCategoryTagId = await getLegacyCategoryTagId(ctx, user._id, args.categoryId);
    const allTagIds = [
      ...ownedTags.map((tag) => tag._id),
      ...(legacyCategoryTagId ? [legacyCategoryTagId] : []),
    ];

    const noteId = await ctx.db.insert("bookNotes", {
      userId: user._id,
      bookId: args.bookId,
      entryType: args.entryType ?? "note",
      audioFileId: audioContext.audioFileId,
      categoryId: args.categoryId,
      startSeconds: audioContext.startSeconds,
      endSeconds: audioContext.endSeconds,
      noteText: normalizeOptionalText(args.noteText),
      sourceText: normalizeOptionalText(args.sourceText),
      createdAt: now,
      updatedAt: now,
    });

    if (allTagIds.length > 0) {
      await upsertNoteTags(ctx, noteId, user._id, allTagIds);
    }

    return noteId;
  },
});

export const updateNote = mutation({
  args: {
    noteId: v.id("bookNotes"),
    entryType: v.optional(
      v.union(
        v.literal("note"),
        v.literal("quote"),
        v.literal("takeaway"),
        v.literal("theme"),
        v.literal("character"),
        v.literal("discussion_prompt")
      )
    ),
    audioFileId: v.optional(v.id("audioFiles")),
    categoryId: v.optional(v.id("noteCategories")),
    startSeconds: v.optional(v.number()),
    endSeconds: v.optional(v.number()),
    noteText: v.optional(v.string()),
    sourceText: v.optional(v.string()),
    tagIds: v.optional(v.array(v.id("memoryTags"))),
  },
  handler: async (ctx, args) => {
    const { user } = await requireAuthMutation(ctx);
    const note = await getOwnedNoteOrThrow(ctx, args.noteId, user._id);
    const now = Date.now();

    const audioContext = await validateOptionalAudioContext(
      ctx,
      note.bookId,
      args.audioFileId,
      args.startSeconds,
      args.endSeconds
    );

    const ownedTags = await validateOwnedTagIds(ctx, user._id, args.tagIds ?? []);
    const legacyCategoryTagId = await getLegacyCategoryTagId(ctx, user._id, args.categoryId);
    const allTagIds = [
      ...ownedTags.map((tag) => tag._id),
      ...(legacyCategoryTagId ? [legacyCategoryTagId] : []),
    ];

    await ctx.db.patch(note._id, {
      entryType: args.entryType ?? note.entryType ?? "note",
      audioFileId: audioContext.audioFileId,
      categoryId: args.categoryId,
      startSeconds: audioContext.startSeconds,
      endSeconds: audioContext.endSeconds,
      noteText: normalizeOptionalText(args.noteText),
      sourceText: normalizeOptionalText(args.sourceText),
      updatedAt: now,
    });

    await upsertNoteTags(ctx, note._id, user._id, allTagIds);
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

    const existingTags = await ctx.db
      .query("bookNoteTags")
      .withIndex("by_note", (q) => q.eq("noteId", note._id))
      .collect();
    await Promise.all(existingTags.map((row) => ctx.db.delete(row._id)));

    await ctx.db.delete(note._id);
    return { success: true };
  },
});
