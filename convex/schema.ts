import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users (synced from Clerk via webhook)
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Migration-ready: Add firebaseUid for future migration
    firebaseUid: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_firebaseUid", ["firebaseUid"])
    .searchIndex("search_users", {
      searchField: "name",
      filterFields: ["email"],
    }),

  // Authors
  authors: defineTable({
    name: v.string(),
    bio: v.optional(v.string()),
    imageR2Key: v.optional(v.string()),
    // Migration-ready
    firebaseId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_firebaseId", ["firebaseId"])
    .searchIndex("search_authors", {
      searchField: "name",
    }),

  // Series
  series: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    // Migration-ready
    firebaseId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_firebaseId", ["firebaseId"])
    .searchIndex("search_series", {
      searchField: "name",
    }),

  // Books
  books: defineTable({
    title: v.string(),
    subtitle: v.optional(v.string()),
    description: v.optional(v.string()),
    isbn: v.optional(v.string()),
    publishedYear: v.optional(v.number()),
    coverImageUrl: v.optional(v.string()),
    language: v.optional(v.string()),
    duration: v.optional(v.number()), // Total audiobook duration in seconds
    // Series relationship
    seriesId: v.optional(v.id("series")),
    seriesOrder: v.optional(v.number()), // Supports decimals (e.g., 2.5 for novellas)
    // Migration-ready
    firebaseId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_isbn", ["isbn"])
    .index("by_publishedYear", ["publishedYear"])
    .index("by_series", ["seriesId"])
    .index("by_series_and_order", ["seriesId", "seriesOrder"])
    .index("by_firebaseId", ["firebaseId"])
    .searchIndex("search_books", {
      searchField: "title",
      filterFields: ["language", "publishedYear"],
    }),

  // Book-Author relationship (many-to-many via join table)
  bookAuthors: defineTable({
    bookId: v.id("books"),
    authorId: v.id("authors"),
    role: v.optional(v.string()), // e.g., "author", "narrator", "translator"
  })
    .index("by_book", ["bookId"])
    .index("by_author", ["authorId"])
    .index("by_book_and_author", ["bookId", "authorId"]),

  // Audio Files (metadata pointing to R2)
  audioFiles: defineTable({
    bookId: v.id("books"),
    fileName: v.string(),
    fileSize: v.number(), // in bytes
    duration: v.number(), // in seconds
    format: v.string(), // e.g., "mp3", "m4a"
    bitrate: v.optional(v.string()),
    // R2 storage info
    r2Key: v.string(), // S3-compatible object key
    r2Bucket: v.string(),
    // Migration-ready
    firebaseStoragePath: v.optional(v.string()),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    // Playback tracking
    chapterNumber: v.optional(v.number()),
    chapterTitle: v.optional(v.string()),
  })
    .index("by_book", ["bookId"])
    .index("by_book_and_chapter", ["bookId", "chapterNumber"])
    .index("by_r2Key", ["r2Key"])
    .index("by_uploadedBy", ["uploadedBy"]),
});
