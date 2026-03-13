# ChapterCheck Schema Proposal

## Status

Draft 1.0  
Date: March 9, 2026

## Purpose

This document proposes the next version of the ChapterCheck domain model.

Goals:

- Support modern reading states
- Support a broader personal memory model for books
- Preserve audiobook functionality without forcing the entire product model to be audio-centric
- Provide a migration path from the current schema

Current reference:

- [schema.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/schema.ts)
- [bookUserData/mutations.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/bookUserData/mutations.ts)
- [bookNotes/mutations.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/bookNotes/mutations.ts)

## Current Model Assessment

## `bookUserData`

Current strengths:

- One per-user, per-book record
- Good place for rating, review, and privacy
- Already the main ownership record for user-book state

Current limitations:

- `isRead` is too narrow for real reading workflows
- Want-to-read is split out conceptually into shelves
- No first-class in-progress state
- No reread support
- No book-level summary field
- No format tracking

## `bookNotes`

Current strengths:

- Private, user-owned notes
- Existing organization model already exists
- Strong support for timestamped audiobook notes

Current limitations:

- Requires `audioFileId`
- Requires time ranges
- Assumes all note-taking is tied to audio playback
- No note type
- No tag model
- No book-level summary or quote structure
- No clean way to search for memory content as distinct content types

## Design Principles

1. Keep user-book state centralized in `bookUserData`
2. Keep memory entries flexible, but typed
3. Keep audio linkage optional, not mandatory
4. Avoid over-normalizing too early
5. Preserve a migration path from current data

## Proposed Domain Model

## 1. Expand `bookUserData`

Recommendation:
Keep `bookUserData` as the primary per-user, per-book state table, but expand it.

### Proposed fields

Existing fields to keep:

- `userId`
- `bookId`
- `rating`
- `reviewText`
- `reviewedAt`
- `isReadPrivate`
- `isReviewPrivate`
- `createdAt`
- `updatedAt`

Fields to replace or deprecate:

- Replace `isRead` with `status`
- Keep `readAt` temporarily for migration and compatibility, but move toward `finishedAt`

New fields:

- `status`
  Allowed values:
  `want_to_read`, `reading`, `finished`, `paused`, `dnf`

- `startedAt`
- `finishedAt`
- `lastStatusChangedAt`
- `rereadCount`
- `currentFormat`
  Allowed values:
  `physical`, `ebook`, `audiobook`, `mixed`

- `personalSummary`
  Short-to-medium user-authored summary of what mattered about the book

- `favorite`
  Boolean for quick resurfacing and filtering

### Why `status` belongs here

This is the canonical user-book state. It should not be inferred from shelves or review presence.

### Why `personalSummary` belongs here

Each user should have at most one primary summary per book. That makes it a better fit for `bookUserData` than for a many-row notes table.

## 2. Evolve `bookNotes` into a broader memory-entry model

Recommendation:
Keep the existing `bookNotes` table, but broaden it so it functions as a memory-entry table.

This avoids an unnecessary rename and reduces migration complexity.

### Proposed fields

Keep:

- `userId`
- `bookId`
- `noteText`
- `createdAt`
- `updatedAt`

Make optional instead of required:

- `audioFileId`
- `startSeconds`
- `endSeconds`

Add:

- `entryType`
  Allowed values:
  `note`, `quote`, `takeaway`, `theme`, `character`, `discussion_prompt`

- `title`
  Optional short label for structured entries

- `sourceText`
  Optional quoted text when the entry is specifically a quote

- `sortOrder`
  Optional manual ordering for future book-level organization

### Why not create a separate `quotes` table now

The product does not yet need a separate operational model for quotes. A typed memory-entry approach is simpler and gives enough flexibility for V1.

### Why not make `summary` an entry type

Summary is distinct:

- only one summary per user/book
- more important than normal notes
- likely shown high in the UI

That makes it better as a field on `bookUserData`.

## 3. Replace categories with tags

Decision:
Use tags instead of categories as the primary note-organization model.

Recommendation:

- Add `memoryTags`
- Add `bookNoteTags`
- Migrate current categories into tags
- Deprecate `noteCategories`

### Tag design

- Tags are per-user
- Tags are reusable
- Tags support quick create
- Each note can have zero to many tags

### Why tags are the better fit

The product is being optimized for retrieval, reflection, and discussion recall.
Tags are better than single-bucket categories for this use case because a single memory entry may need multiple descriptors.

### Why still keep `entryType`

`entryType` and tags solve different problems:

- `entryType` answers what kind of memory this is
- `tags` answer what the memory is about

That separation is worth preserving.

## 4. Keep shelves as book-level organization, not note-level organization

Recommendation:
Shelves remain for books.
Memory entries stay organized through type, tags, and search.

This keeps the mental model clear:

- shelves organize books
- memory entries organize thoughts within books

## Proposed Table Changes

## `memoryTags`

### Proposed shape

```ts
memoryTags: defineTable({
  userId: v.id("users"),
  name: v.string(),
  normalizedName: v.string(),
  createdAt: v.number(),
  updatedAt: v.number(),
});
```

### Suggested indexes

- `by_user`
- `by_user_and_normalizedName`

## `bookNoteTags`

### Proposed shape

```ts
bookNoteTags: defineTable({
  noteId: v.id("bookNotes"),
  tagId: v.id("memoryTags"),
  userId: v.id("users"),
  createdAt: v.number(),
});
```

### Suggested indexes

- `by_note`
- `by_tag`
- `by_user_and_tag`
- `by_note_and_tag`

## `bookUserData`

### Proposed shape

```ts
bookUserData: defineTable({
  userId: v.id("users"),
  bookId: v.id("books"),

  status: v.union(
    v.literal("want_to_read"),
    v.literal("reading"),
    v.literal("finished"),
    v.literal("paused"),
    v.literal("dnf")
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

  rating: v.optional(v.number()),
  reviewText: v.optional(v.string()),
  reviewedAt: v.optional(v.number()),

  isReadPrivate: v.boolean(),
  isReviewPrivate: v.boolean(),

  // legacy support during migration
  isRead: v.optional(v.boolean()),
  readAt: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
});
```

### Suggested indexes

Keep:

- `by_user_and_book`
- `by_user`
- `by_book`
- `by_user_and_reviewedAt`
- `by_book_and_reviewedAt`

Add:

- `by_user_and_status`
- `by_user_and_finishedAt`
- `by_user_and_startedAt`
- `by_user_and_updatedAt`
- `by_user_and_favorite`

## `bookNotes`

### Proposed shape

```ts
bookNotes: defineTable({
  userId: v.id("users"),
  bookId: v.id("books"),

  entryType: v.union(
    v.literal("note"),
    v.literal("quote"),
    v.literal("takeaway"),
    v.literal("theme"),
    v.literal("character"),
    v.literal("discussion_prompt")
  ),

  title: v.optional(v.string()),
  noteText: v.optional(v.string()),
  sourceText: v.optional(v.string()),

  audioFileId: v.optional(v.id("audioFiles")),
  startSeconds: v.optional(v.number()),
  endSeconds: v.optional(v.number()),

  sortOrder: v.optional(v.number()),

  createdAt: v.number(),
  updatedAt: v.number(),
});
```

### Suggested indexes

Keep:

- `by_user_and_book`
- `by_user_and_updatedAt`

Add:

- `by_user_and_book_and_type`
- `by_user_and_type_and_updatedAt`
- `by_user_and_book_and_audioFile`

## Behavior Rules

## Reading status rules

- `want_to_read`:
  no `startedAt` or `finishedAt` required

- `reading`:
  set `startedAt` if not already set

- `finished`:
  set `finishedAt`
  may also set `startedAt` if absent

- `paused`:
  preserve `startedAt`
  no `finishedAt`

- `dnf`:
  preserve `startedAt`
  no `finishedAt`

## Review rules

- A review no longer implicitly means the book is read via `isRead`
- Saving a review should strongly suggest `finished`, but the system should not depend on binary read state

## Memory entry rules

- Entries may exist without any audio linkage
- If one of `audioFileId`, `startSeconds`, or `endSeconds` is set, validate the full audio context
- `quote` entries may use both `sourceText` and `noteText`
- Non-audio users must be able to create entries without extra friction
- Tags are optional and reusable
- Tag names should be normalized case-insensitively per user to avoid duplicates like `Ending` and `ending`

## Migration Strategy

## `bookUserData` migration

Map existing rows as follows:

- `isRead = false`
  -> `status = want_to_read` if on want-to-read shelf, otherwise leave unset until touched or default to `reading` is not safe

- `isRead = true`
  -> `status = finished`
  -> `finishedAt = readAt`

- `readAt`
  -> `finishedAt`

- Keep legacy fields temporarily for compatibility during rollout

### Recommended approach

1. Add new fields first
2. Backfill with migration script
3. Update queries and mutations to use `status`
4. Update clients
5. Remove legacy `isRead` assumptions later

## `noteCategories` migration

Map existing rows as follows:

- each category becomes a per-user tag in `memoryTags`
- each note using a category gets a matching row in `bookNoteTags`
- tag names should be normalized from category names

### Recommended approach

1. Add `memoryTags` and `bookNoteTags`
2. Backfill tags from existing categories
3. Backfill note-tag joins from existing `categoryId`
4. Update clients to use tags
5. Remove or ignore `noteCategories` once all clients are migrated

## `bookNotes` migration

Map existing rows as follows:

- existing note rows -> `entryType = note`
- preserve audio linkage and time ranges
- no content loss expected

### Recommended approach

1. Add `entryType`, make audio fields optional
2. Backfill old notes to `entryType = note`
3. Update note creation flows to support non-audio entries

## Query and Mutation Changes Needed

## `bookUserData`

Replace or extend:

- `markAsRead`
  -> replace with a more general `setReadingStatus`

- `saveReview`
  -> stop depending on binary read semantics

- profile/history queries
  -> use `status`, `finishedAt`, and `startedAt`

## `bookNotes`

Extend:

- create and update note mutations to support optional audio linkage
- replace category ownership validation with tag ownership validation
- add note-tag attach/detach logic
- add queries by entry type
- add recent memory queries for home and notes hub
- add search support for note content

## Search Implications

To support the new product promise, search should eventually include:

- books
- authors
- series
- shelves
- memory entries

Recommended first step:

Add memory-entry search results using `noteText`, `title`, and `sourceText`.

## Open Decisions

## Decision 1: Keep `isReadPrivate` naming or rename?

Recommendation:
Keep it for now to reduce migration cost, even though `statusPrivate` would be more semantically correct.

## Decision 2: Add `reread` as a status or use `rereadCount`?

Recommendation:
Do not make `reread` a primary status.
Use `status` plus `rereadCount`.

Reason:

- reread is an attribute of the reading history, not a stable state
- users still need to be `reading` or `finished`

## Decision 3: Add format tracking in V1?

Decision:
Yes, keep it lightweight with `currentFormat`.

## Decision 4: Add tags now?

Decision:
Yes. Add per-user reusable tags now and migrate existing categories into them.

## Decision 5: Keep note titles in V1?

Decision:
No. Do not require or prioritize note titles in V1.

Rationale:

- note text, entry type, and tags should carry most of the value
- removing titles keeps creation fast
- titles can be added later if real usage shows the need

## Recommended Implementation Order

1. Expand `bookUserData`
2. Expand `bookNotes`
3. Add `memoryTags` and `bookNoteTags`
4. Add migration scripts
5. Update book user data queries/mutations
6. Update note queries/mutations
7. Update iOS models and repositories
8. Add search support for memory entries

## Recommendation Summary

The best next schema is evolutionary, not revolutionary:

- keep `bookUserData` as the canonical user-book state
- broaden it with `status`, `summary`, and richer timestamps
- keep `bookNotes`, but make it a typed memory-entry table with optional audio linkage
- add per-user reusable tags and migrate existing categories into them
- preserve audiobook support without making it mandatory for note-taking
