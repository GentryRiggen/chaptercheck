import { PutObjectCommand } from "@aws-sdk/client-s3";
import { v } from "convex/values";

import { internal } from "../_generated/api";
import { type Id } from "../_generated/dataModel";
import { action, internalAction, internalMutation, mutation } from "../_generated/server";
import { getR2Client } from "../lib/r2Client";

// Internal mutation to upsert an author (for migration)
export const upsertAuthor = internalMutation({
  args: {
    firebaseId: v.string(),
    name: v.string(),
    bio: v.optional(v.string()),
    imageR2Key: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if author already exists by firebaseId
    const existing = await ctx.db
      .query("authors")
      .withIndex("by_firebaseId", (q) => q.eq("firebaseId", args.firebaseId))
      .first();

    const now = Date.now();

    if (existing) {
      // Update existing author
      await ctx.db.patch(existing._id, {
        name: args.name,
        bio: args.bio,
        imageR2Key: args.imageR2Key,
        updatedAt: now,
      });
      return existing._id;
    }

    // Create new author
    return await ctx.db.insert("authors", {
      firebaseId: args.firebaseId,
      name: args.name,
      bio: args.bio,
      imageR2Key: args.imageR2Key,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Internal mutation to upsert a series (for migration)
export const upsertSeries = internalMutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if series already exists by name
    const existing = await ctx.db
      .query("series")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    const now = Date.now();

    if (existing) {
      return existing._id;
    }

    // Create new series
    return await ctx.db.insert("series", {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Internal mutation to upsert a book (for migration)
export const upsertBook = internalMutation({
  args: {
    firebaseId: v.string(),
    title: v.string(),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    isbn: v.optional(v.string()),
    publishedYear: v.optional(v.number()),
    coverImageR2Key: v.optional(v.string()),
    language: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    seriesOrder: v.optional(v.number()),
    authorIds: v.array(v.id("authors")),
  },
  handler: async (ctx, args) => {
    const { authorIds, ...bookData } = args;

    // Check if book already exists by firebaseId
    const existing = await ctx.db
      .query("books")
      .withIndex("by_firebaseId", (q) => q.eq("firebaseId", args.firebaseId))
      .first();

    const now = Date.now();

    let bookId: Id<"books">;

    if (existing) {
      // Update existing book
      await ctx.db.patch(existing._id, {
        ...bookData,
        updatedAt: now,
      });
      bookId = existing._id;

      // Delete existing author relationships
      const existingBookAuthors = await ctx.db
        .query("bookAuthors")
        .withIndex("by_book", (q) => q.eq("bookId", bookId))
        .collect();

      await Promise.all(existingBookAuthors.map((ba) => ctx.db.delete(ba._id)));
    } else {
      // Create new book
      bookId = await ctx.db.insert("books", {
        ...bookData,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Add author relationships
    await Promise.all(
      authorIds.map((authorId) =>
        ctx.db.insert("bookAuthors", {
          bookId,
          authorId,
          role: "author",
        })
      )
    );

    return bookId;
  },
});

// Internal action to upload an image to R2 from a URL
export const uploadImageFromUrl = internalAction({
  args: {
    imageUrl: v.string(),
    path: v.string(), // e.g., "books/covers" or "authors"
    fileName: v.string(),
  },
  handler: async (ctx, args) => {
    try {
      // Fetch the image
      const response = await fetch(args.imageUrl);
      if (!response.ok) {
        console.log(`Failed to fetch image from ${args.imageUrl}: ${response.status}`);
        return null;
      }

      const contentType = response.headers.get("content-type") || "image/jpeg";
      const arrayBuffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Reject placeholder images (Open Library returns ~43 byte 1x1 GIF when no image)
      if (uint8Array.length < 1000) {
        console.log(
          `Image too small (${uint8Array.length} bytes), likely a placeholder: ${args.imageUrl}`
        );
        return null;
      }

      const r2Client = getR2Client();
      const bucketName = process.env.R2_BUCKET_NAME;

      if (!bucketName) {
        throw new Error("R2_BUCKET_NAME not configured");
      }

      const timestamp = Date.now();
      const sanitizedFileName = args.fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
      const r2Key = `media/${args.path}/${timestamp}-${sanitizedFileName}`;

      const command = new PutObjectCommand({
        Bucket: bucketName,
        Key: r2Key,
        Body: uint8Array,
        ContentType: contentType,
      });

      await r2Client.send(command);

      return r2Key;
    } catch (error) {
      console.error(`Error uploading image from ${args.imageUrl}:`, error);
      return null;
    }
  },
});

// Get author by firebaseId
export const getAuthorByFirebaseId = internalMutation({
  args: { firebaseId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("authors")
      .withIndex("by_firebaseId", (q) => q.eq("firebaseId", args.firebaseId))
      .first();
  },
});

// Get book by firebaseId
export const getBookByFirebaseId = internalMutation({
  args: { firebaseId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("books")
      .withIndex("by_firebaseId", (q) => q.eq("firebaseId", args.firebaseId))
      .first();
  },
});

// ============================================
// PUBLIC MUTATIONS FOR MIGRATION SCRIPT
// These can be called from external scripts
// ============================================

// Migrate an author
export const migrateAuthor = action({
  args: {
    firebaseId: v.string(),
    name: v.string(),
    bio: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ authorId: Id<"authors">; imageR2Key: string | undefined }> => {
    let imageR2Key: string | undefined = undefined;

    // Upload image if provided
    if (args.imageUrl) {
      const r2Key = await ctx.runAction(internal.migration.mutations.uploadImageFromUrl, {
        imageUrl: args.imageUrl,
        path: "authors",
        fileName: `${args.name.replace(/\s+/g, "-")}.jpg`,
      });
      if (r2Key) {
        imageR2Key = r2Key;
      }
    }

    // Upsert author
    const authorId = await ctx.runMutation(internal.migration.mutations.upsertAuthor, {
      firebaseId: args.firebaseId,
      name: args.name,
      bio: args.bio,
      imageR2Key,
    });

    return { authorId, imageR2Key };
  },
});

// Migrate a series
export const migrateSeries = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if series already exists by name
    const existing = await ctx.db
      .query("series")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("series", {
      name: args.name,
      description: args.description,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Migrate a book
export const migrateBook = action({
  args: {
    firebaseId: v.string(),
    title: v.string(),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    isbn: v.optional(v.string()),
    publishedYear: v.optional(v.number()),
    coverImageUrl: v.optional(v.string()),
    language: v.optional(v.string()),
    seriesId: v.optional(v.id("series")),
    seriesOrder: v.optional(v.number()),
    authorFirebaseIds: v.array(v.string()),
  },
  handler: async (
    ctx,
    args
  ): Promise<{ bookId: Id<"books">; coverImageR2Key: string | undefined }> => {
    let coverImageR2Key: string | undefined = undefined;

    // Upload cover image if provided
    if (args.coverImageUrl) {
      const r2Key = await ctx.runAction(internal.migration.mutations.uploadImageFromUrl, {
        imageUrl: args.coverImageUrl,
        path: "books/covers",
        fileName: `${args.title.replace(/\s+/g, "-")}.jpg`,
      });
      if (r2Key) {
        coverImageR2Key = r2Key;
      }
    }

    // Get Convex author IDs from firebase IDs
    const authorIds: Id<"authors">[] = [];
    for (const firebaseId of args.authorFirebaseIds) {
      const author = await ctx.runMutation(internal.migration.mutations.getAuthorByFirebaseId, {
        firebaseId,
      });
      if (author) {
        authorIds.push(author._id);
      }
    }

    if (authorIds.length === 0) {
      throw new Error(`No authors found for book: ${args.title}`);
    }

    // Upsert book
    const bookId = await ctx.runMutation(internal.migration.mutations.upsertBook, {
      firebaseId: args.firebaseId,
      title: args.title,
      subtitle: args.subtitle,
      description: args.description,
      isbn: args.isbn,
      publishedYear: args.publishedYear,
      coverImageR2Key,
      language: args.language,
      seriesId: args.seriesId,
      seriesOrder: args.seriesOrder,
      authorIds,
    });

    return { bookId, coverImageR2Key };
  },
});

// Get series by name
export const getSeriesByName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("series")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
  },
});
