import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Storage Accounts (can be shared by multiple users)
  storageAccounts: defineTable({
    name: v.optional(v.string()), // Optional display name for the account
    r2PathPrefix: v.string(), // e.g., "storage-accounts/{storageAccountId}" - unique prefix for R2 keys
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
    isProfilePrivate: v.optional(v.boolean()), // defaults to false = public profile
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

  // User Preferences (playback settings, synced across devices)
  userPreferences: defineTable({
    userId: v.id("users"),
    skipForwardSeconds: v.optional(v.number()), // default: 30
    skipBackwardSeconds: v.optional(v.number()), // default: 15
    momentumSkipEnabled: v.optional(v.boolean()), // default: true
    smartRewindEnabled: v.optional(v.boolean()), // default: true
    voiceBoostEnabled: v.optional(v.boolean()), // default: false
    accentColor: v.optional(v.string()), // default: "blue"
    colorSchemeMode: v.optional(v.string()), // "system" | "light" | "dark"
    autoDownloadOnPlay: v.optional(v.boolean()), // default: false — silently download instead of prompting
    downloadNetwork: v.optional(v.string()), // "wifi" | "wifiAndCellular" — gates prompts + auto-downloads
    deleteDownloadAfterPlay: v.optional(v.string()), // "ask" | "auto" | "off" — what to do with downloads after book finishes
    airpodsDoubleClickAction: v.optional(v.string()), // "skipForward" | "skipBackward" | "nextPart" | "previousPart" | "disabled"
    airpodsTripleClickAction: v.optional(v.string()), // "skipForward" | "skipBackward" | "nextPart" | "previousPart" | "disabled"
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_userId", ["userId"]),

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
    // Denormalized rating stats (updated when reviews change)
    averageRating: v.optional(v.number()), // Average of all ratings (1-3 scale)
    ratingCount: v.optional(v.number()), // Number of ratings
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
    .index("by_averageRating", ["averageRating"])
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

  // Genres
  genres: defineTable({
    name: v.string(),
    slug: v.string(), // lowercase, hyphenated (for deduplication)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .searchIndex("search_genres", { searchField: "name" }),

  // Book-Genre Votes (who voted for which genre on which book)
  bookGenreVotes: defineTable({
    bookId: v.id("books"),
    genreId: v.id("genres"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_book", ["bookId"])
    .index("by_genre", ["genreId"])
    .index("by_book_and_user", ["bookId", "userId"])
    .index("by_book_genre_user", ["bookId", "genreId", "userId"]),

  // Shelves (user-created book lists)
  shelves: defineTable({
    userId: v.id("users"),
    name: v.string(),
    description: v.optional(v.string()),
    isOrdered: v.boolean(),
    isPublic: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Shelf-Book relationship (many-to-many)
  shelfBooks: defineTable({
    shelfId: v.id("shelves"),
    bookId: v.id("books"),
    position: v.optional(v.number()),
    addedAt: v.number(),
  })
    .index("by_shelf", ["shelfId"])
    .index("by_shelf_and_position", ["shelfId", "position"])
    .index("by_book", ["bookId"])
    .index("by_shelf_and_book", ["shelfId", "bookId"]),

  // Listening Progress (playback position & per-book speed)
  listeningProgress: defineTable({
    userId: v.id("users"),
    bookId: v.id("books"),
    audioFileId: v.id("audioFiles"), // Current file being listened to
    positionSeconds: v.number(), // Position within that file
    playbackRate: v.number(), // Per-book speed (e.g., 1.5)
    lastListenedAt: v.number(), // Timestamp of last save
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_book", ["userId", "bookId"])
    .index("by_user_and_lastListened", ["userId", "lastListenedAt"]),

  // Reusable note categories for private timestamped book notes
  noteCategories: defineTable({
    userId: v.id("users"),
    name: v.string(),
    colorToken: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_name", ["userId", "name"]),

  // Private per-user timestamped notes tied to a book audio file range
  bookNotes: defineTable({
    userId: v.id("users"),
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
    // Legacy category support during migration to tags
    categoryId: v.optional(v.id("noteCategories")),
    startSeconds: v.optional(v.number()),
    endSeconds: v.optional(v.number()),
    noteText: v.optional(v.string()),
    sourceText: v.optional(v.string()),
    sortOrder: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_book", ["userId", "bookId"])
    .index("by_user_and_book_and_audioFile", ["userId", "bookId", "audioFileId"])
    .index("by_user_and_updatedAt", ["userId", "updatedAt"])
    .index("by_user_and_book_and_type", ["userId", "bookId", "entryType"])
    .index("by_user_and_type_and_updatedAt", ["userId", "entryType", "updatedAt"]),

  // Reusable per-user memory tags for notes, quotes, takeaways, and themes
  memoryTags: defineTable({
    userId: v.id("users"),
    name: v.string(),
    normalizedName: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_normalizedName", ["userId", "normalizedName"]),

  // Join table between memory entries and tags
  bookNoteTags: defineTable({
    noteId: v.id("bookNotes"),
    tagId: v.id("memoryTags"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_note", ["noteId"])
    .index("by_tag", ["tagId"])
    .index("by_user_and_tag", ["userId", "tagId"])
    .index("by_note_and_tag", ["noteId", "tagId"]),

  // Book User Data (read status, ratings, reviews)
  bookUserData: defineTable({
    userId: v.id("users"),
    bookId: v.id("books"),

    // Read status (legacy + new model during migration)
    status: v.optional(
      v.union(
        v.literal("want_to_read"),
        v.literal("reading"),
        v.literal("finished"),
        v.literal("paused"),
        v.literal("dnf")
      )
    ),
    startedAt: v.optional(v.number()),
    finishedAt: v.optional(v.number()),
    lastStatusChangedAt: v.optional(v.number()),
    rereadCount: v.optional(v.number()),
    currentFormat: v.optional(
      v.union(v.literal("physical"), v.literal("ebook"), v.literal("audiobook"), v.literal("mixed"))
    ),
    favorite: v.optional(v.boolean()),
    personalSummary: v.optional(v.string()),

    // Legacy compatibility fields
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
    .index("by_book_and_reviewedAt", ["bookId", "reviewedAt"]) // Book page
    .index("by_user_and_status", ["userId", "status"])
    .index("by_user_and_finishedAt", ["userId", "finishedAt"])
    .index("by_user_and_startedAt", ["userId", "startedAt"])
    .index("by_user_and_updatedAt", ["userId", "updatedAt"])
    .index("by_user_and_favorite", ["userId", "favorite"]),
});
