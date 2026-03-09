# ChapterCheck Product Roadmap

## Status

Draft 1.0  
Date: March 9, 2026  
Companion to: [product-requirements.md](/Users/griggen/dev/code/personal/chaptercheck/docs/product-requirements.md)

## Purpose

This document turns the PRD into an execution plan for the current codebase.

It answers four questions:

1. What features do we keep, cut, change, or add?
2. What should the iOS app structure become?
3. What should be built first for App Store launch?
4. How does that map to the existing repo?

## Product Direction

ChapterCheck will ship as a personal book memory app with audiobook support.

That means:

- The core loop is add book -> read or listen -> save thoughts -> retrieve later
- The main value is memory and organization
- Audiobook playback remains important, but file management is not the main product story

## Priority Matrix

## Keep Now

These are already useful and aligned with the new product direction.

| Area          | Keep                                           | Notes                          |
| ------------- | ---------------------------------------------- | ------------------------------ |
| Library model | Books, authors, series, genres, shelves        | Strong base already exists     |
| Reading state | Read state, rating, review, want-to-read shelf | Expand rather than replace     |
| Notes         | Timestamped notes and note categories          | Extend to broader memory model |
| Search        | Unified entity search and book search          | Expand to note retrieval       |
| Audio         | Playback, progress, downloads, offline queue   | Keep as advanced support layer |
| Privacy       | Private profile, review privacy, shelf privacy | Keep, simplify messaging       |

## Change Soon

These exist today, but need reframing or redesign.

| Area         | Current State              | Change Needed                              |
| ------------ | -------------------------- | ------------------------------------------ |
| Home         | Listening-first            | Make it reading-memory-first               |
| Book detail  | Audio/review heavy         | Make notes, summary, and recall central    |
| Search       | Entity-first               | Make memory retrieval first-class          |
| Review model | Public-review flavored     | Shift toward private reflection first      |
| Profiles     | More prominent than needed | Reduce emphasis in primary flows           |
| Audio upload | Feels core to product      | Move to advanced or secondary entry points |

## Add Before App Store Launch

| Feature                    | Why It Matters               | Scope                                                  |
| -------------------------- | ---------------------------- | ------------------------------------------------------ |
| Multi-state reading status | Expected by readers          | Want to Read, Reading, Finished, Paused, DNF, Reread   |
| Fast capture               | Required for habit formation | Add book via search, manual entry, scan                |
| Memory model               | Core product value           | Summary, quotes, takeaways, themes, discussion prompts |
| Search across memory       | Delivers promise of recall   | Note/quote/tag/theme search                            |
| Goals and stats            | Market expectation           | Annual goal, books finished, monthly history           |
| Better onboarding          | Empty apps lose users        | First book, first shelf, first note flows              |
| Consumer account flows     | App Store readiness          | Account deletion, privacy clarity                      |

## Add After Launch

| Feature                       | Why Later                                                    |
| ----------------------------- | ------------------------------------------------------------ |
| Goodreads / StoryGraph import | High leverage, but not required for internal coherence first |
| Shareable discussion cards    | Useful growth layer after core memory workflow works         |
| Resurfacing reminders         | Valuable once enough data exists                             |
| Recommendation engine         | Depends on stronger data and positioning                     |
| Social expansion              | Not necessary for V1 retention                               |

## De-Prioritize

| Area                         | Reason                                     |
| ---------------------------- | ------------------------------------------ |
| User discovery               | Not a core job to be done                  |
| Social feed mechanics        | Too broad for V1                           |
| Storage-account UX           | Internal/admin concern, not consumer value |
| Complex audio admin surfaces | Valuable only to power users               |

## Revised iOS Information Architecture

## Recommended Primary Navigation

1. Home
2. Library
3. Notes
4. Activity
5. Settings

## Tab Intent

### 1. Home

Purpose:
Give users a useful snapshot of their reading life.

Key modules:

- Continue reading/listening
- Recently added books
- Recent notes
- Resurfaced books
- Progress toward yearly goal
- Quick add book

Current implementation base:

- [HomeView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeView.swift)
- [HomeViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeViewModel.swift)

Needed change:

- Stop making listening progress the dominant hero when the user is not actively using audio
- Add memory-oriented modules and quick actions

### 2. Library

Purpose:
Browse and organize all books.

Key modules:

- Search books
- Filter by status, shelf, genre, author, format
- Sort by recent activity, title, completion date, rating
- Add book
- Shelf and tag management

Current implementation base:

- [LibraryView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Library/LibraryView.swift)
- [BookRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/BookRepository.swift)

Needed change:

- Expand beyond title/genre sorting into reading-status organization
- Add fast capture entry points

### 3. Notes

Purpose:
Make saved reading memory accessible as a first-class destination.

Key modules:

- Recent notes
- Quotes
- Themes
- Search notes
- Filter by book, tag, category, date

Current implementation base:

- [BookNotesRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/BookNotesRepository.swift)
- [BookDetailViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailViewModel.swift)

Needed change:

- Create a standalone notes hub
- Broaden note model beyond audio timestamps only

### 4. Activity

Purpose:
Show progress, goals, and reading history.

Key modules:

- Annual goal
- Books finished this year
- Monthly reading history
- Rereads
- Stats by genre/author/format

Current implementation base:

- Partial data exists in profile/history/review surfaces

Needed change:

- Introduce a dedicated consumer-facing stats destination rather than burying this under profile

### 5. Settings

Purpose:
Account, privacy, theme, downloads, advanced audio settings.

Current implementation base:

- [SettingsView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Settings/SettingsView.swift)

Needed change:

- Keep this area functional
- Move power-user audio management here rather than into core navigation

## Revised Book Detail Structure

The book detail view should become the center of the product.

## Recommended section order

1. Title, cover, author, status
2. Personal summary
3. Notes and quotes
4. Discussion prompts / takeaways
5. Progress and format-specific actions
6. Review
7. Shelves / organization
8. Audio files and advanced listening tools

Current implementation base:

- [BookDetailView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailView.swift)
- [BookDetailViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailViewModel.swift)

Needed change:

- Move audio file list lower
- Promote note and summary workflows higher
- Add a book-level memory summary model

## User Journey Priorities

## Journey 1: New User Onboarding

Goal:
Get the user to experience the product value within the first session.

Target flow:

1. Create account
2. Choose goal or skip
3. Add first books
4. Choose statuses
5. Create first shelf or tag
6. Open one book
7. Save one note, quote, or summary

Definition of success:

- User adds at least 3 books
- User sets at least 1 status
- User saves at least 1 piece of memory content

## Journey 2: Add a Book Fast

Goal:
Minimize friction.

Target flow:

1. Tap add
2. Search title/author/ISBN or scan barcode
3. Confirm metadata
4. Set status
5. Optional shelf/tag

Definition of success:

- Under 20 seconds for a known book found via search

## Journey 3: Save a Thought While Reading or Listening

Goal:
Make capture easy enough to become a habit.

Target flow:

1. Open book or player
2. Tap note or quote
3. Save text
4. Optionally assign category/tag/timestamp

Definition of success:

- Note saved in under 10 seconds

## Journey 4: Retrieve an Old Thought

Goal:
Deliver the product promise of long-term recall.

Target flow:

1. Search by quote, theme, author, or book
2. View note results
3. Jump to book context
4. Use summary to refresh memory quickly

Definition of success:

- User can find a past note without remembering the book title

## Technical Roadmap by Phase

## Phase 0: Cleanup and Product Framing

Objective:
Align the current app structure with the new product story before adding many features.

Work:

- Update app copy and onboarding language
- Audit navigation labels and entry points
- De-emphasize upload/admin language in consumer-facing UI
- Decide whether web remains admin-first or consumer-facing

Likely touchpoints:

- [HomeView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeView.swift)
- [SettingsView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Settings/SettingsView.swift)
- [README.md](/Users/griggen/dev/code/personal/chaptercheck/README.md)

## Phase 1: Reading Status Foundation

Objective:
Move from a binary read model to a modern reading-state model.

Current state:

- [BookUserData.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Models/BookUserData.swift) supports `isRead`, review, rating, and privacy
- Want-to-read is currently partly modeled through shelves

Needed backend changes:

- Extend `bookUserData` to support richer status
- Add fields for current status, finishedAt, startedAt, rereadCount, maybe format
- Migrate existing `isRead` and want-to-read assumptions

Likely touchpoints:

- [schema.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/schema.ts)
- `packages/convex-backend/convex/bookUserData/*`
- [BookUserData.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Models/BookUserData.swift)
- [BookDetailViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailViewModel.swift)
- [LibraryView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Library/LibraryView.swift)

## Phase 2: Add Book and Onboarding

Objective:
Make it easy for new users to populate the library.

Work:

- Add quick add flow on iOS
- Add ISBN/barcode scan path
- Add manual add fallback
- Add onboarding steps tied to first book, shelf, and note

Likely touchpoints:

- New iOS feature module for add-book flow
- Existing Open Library support in shared/backend
- [SearchRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/SearchRepository.swift)
- `packages/convex-backend/convex/openLibrary/*`

## Phase 3: Memory Model Expansion

Objective:
Turn notes into a broader memory system.

Current state:

- Notes exist and are tied to book plus audio file ranges
- Categories exist

Problem:

- The model is currently too audio-centric for the App Store positioning

Recommended change:

- Add optional note type:
  note, quote, takeaway, theme, character, discussionPrompt, summary
- Make audio file linkage optional for some memory entries
- Add book-level summary support
- Add optional tags

Likely touchpoints:

- [schema.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/schema.ts)
- `packages/convex-backend/convex/bookNotes/*`
- [BookNotesRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/BookNotesRepository.swift)
- [BookDetailViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailViewModel.swift)
- [NowPlayingView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Player/NowPlayingView.swift)

## Phase 4: Retrieval and Search

Objective:
Make old thoughts actually findable.

Current state:

- Search covers books, authors, series, users
- Notes are not a first-class search result type

Recommended change:

- Add note and quote search
- Add filters by content type
- Add recent searches
- Add a dedicated Notes destination

Likely touchpoints:

- [search/queries.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/search/queries.ts)
- [SearchRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/SearchRepository.swift)
- [SearchView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Search/SearchView.swift)
- New iOS notes hub screens

## Phase 5: Home Rework

Objective:
Make the home screen represent the product correctly.

Current state:

- Home is centered on continue listening, top rated books, and shelves

Recommended change:

- Keep continue listening, but reduce dominance
- Add recent notes
- Add books recently finished
- Add yearly goal progress
- Add quick add and resume memory work

Likely touchpoints:

- [HomeView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeView.swift)
- [HomeViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeViewModel.swift)
- New backend queries for recent notes and yearly progress

## Phase 6: Activity and Goals

Objective:
Meet category expectations for reading trackers.

Work:

- Add yearly goal
- Add monthly completion history
- Add personal stats surfaces
- Add reread tracking

Likely touchpoints:

- `userPreferences` or new stats/goals tables
- New activity screens on iOS
- Profile/history queries may be repurposed

## Phase 7: App Store Readiness

Objective:
Finish consumer polish and compliance.

Work:

- Improve first-run and empty states
- Add account deletion flow
- Review privacy language
- Tighten app metadata, screenshots, onboarding copy
- Ensure non-audio users have a complete path through the app

Likely touchpoints:

- [SettingsView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Settings/SettingsView.swift)
- Clerk/account flows
- App Store assets and copy outside repo as needed

## Proposed Backlog Order

Recommended order of implementation:

1. Reading status foundation
2. Add book and onboarding
3. Memory model expansion
4. Search and retrieval
5. Home rework
6. Goals and activity
7. App Store readiness polish

## Repo Mapping Summary

## Backend

Primary areas likely to change:

- [schema.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/schema.ts)
- `packages/convex-backend/convex/bookUserData/*`
- `packages/convex-backend/convex/bookNotes/*`
- [search/queries.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/search/queries.ts)
- `packages/convex-backend/convex/books/*`

## iOS

Primary areas likely to change:

- [AppDestination.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Navigation/AppDestination.swift)
- [HomeView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeView.swift)
- [LibraryView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Library/LibraryView.swift)
- [BookDetailView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailView.swift)
- [SearchView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Search/SearchView.swift)
- [SettingsView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Settings/SettingsView.swift)

## Web

Primary role recommendation:

- Keep web useful for admin, import, and content management first
- Reassess consumer-facing web parity after the iOS App Store product is coherent

## Suggested Next Deliverables

The next planning outputs should be:

1. A schema proposal for reading status plus expanded memory types
2. Wireframes for new iOS navigation and book detail layout
3. A milestone-based implementation checklist
4. A launch checklist for App Store submission
