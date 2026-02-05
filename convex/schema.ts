import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Storage Accounts (can be shared by multiple users)
  storageAccounts: defineTable({
    name: v.optional(v.string()), // Optional display name for the account
    r2PathPrefix: v.string(), // e.g., "users/{clerkId}" - unique prefix for R2 keys
    totalBytesUsed: v.number(),
    fileCount: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  // Users (synced from Clerk via webhook)
  users: defineTable({
    clerkId: v.string(), // Clerk user ID
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    // Role hierarchy: admin > editor > viewer
    // Legacy "user" role maps to "viewer" via getEffectiveRole()
    role: v.optional(
      v.union(v.literal("admin"), v.literal("editor"), v.literal("viewer"), v.literal("user"))
    ), // defaults to "viewer"
    hasPremium: v.optional(v.boolean()), // defaults to false, gates audio features
    // Storage account (optional, created lazily on first upload)
    // Multiple users can share the same storage account
    storageAccountId: v.optional(v.id("storageAccounts")),
    // Migration-ready: Add firebaseUid for future migration
    firebaseUid: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_firebaseUid", ["firebaseUid"])
    .index("by_storageAccountId", ["storageAccountId"])
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
    coverImageR2Key: v.optional(v.string()),
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
    .index("by_title", ["title"])
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
    // Storage account (for per-user isolation)
    // Optional during migration, will be required after backfill
    storageAccountId: v.optional(v.id("storageAccounts")),
    // Migration-ready
    firebaseStoragePath: v.optional(v.string()),
    uploadedBy: v.id("users"),
    uploadedAt: v.number(),
    // Ordering within book (optional for migration, new uploads should always have this)
    partNumber: v.optional(v.number()), // 1-based order for display naming (part1, part2, etc.)
    // Playback tracking (optional chapter metadata)
    chapterNumber: v.optional(v.number()),
    chapterTitle: v.optional(v.string()),
  })
    .index("by_book", ["bookId"])
    .index("by_book_and_part", ["bookId", "partNumber"])
    .index("by_book_and_chapter", ["bookId", "chapterNumber"])
    .index("by_r2Key", ["r2Key"])
    .index("by_uploadedBy", ["uploadedBy"])
    .index("by_storageAccount", ["storageAccountId"])
    .index("by_storageAccount_and_book", ["storageAccountId", "bookId"]),

  // Book User Data (read status, ratings, reviews)
  bookUserData: defineTable({
    userId: v.id("users"),
    bookId: v.id("books"),

    // Read status
    isRead: v.boolean(),
    readAt: v.optional(v.number()),

    // Rating & Review
    rating: v.optional(v.number()), // 1, 2, or 3 stars
    reviewText: v.optional(v.string()),
    reviewedAt: v.optional(v.number()),

    // Privacy
    isReadPrivate: v.boolean(), // default: false
    isReviewPrivate: v.boolean(), // default: false
    // Invariant: isReadPrivate=true forces isReviewPrivate=true

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_book", ["userId", "bookId"]) // Primary lookup
    .index("by_user", ["userId"]) // User's library
    .index("by_book", ["bookId"]) // Book's reviews
    .index("by_user_and_reviewedAt", ["userId", "reviewedAt"]) // Profile
    .index("by_book_and_reviewedAt", ["bookId", "reviewedAt"]), // Book page
});
