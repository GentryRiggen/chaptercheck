# ChapterCheck Product Requirements

## Status

Draft 1.0  
Date: March 9, 2026  
Owner: Product discovery

## Executive Summary

ChapterCheck should ship to the App Store as a personal book memory app, not as a generic audiobook file manager and not as a Goodreads-style social network.

The core promise is:

> Remember what you read, why it mattered, and what to say about it later.

The app should help users build a private, organized, searchable record of their reading life: books, notes, quotes, reactions, takeaways, shelves, and progress over time.

Audiobook file management remains supported because it is a real user need for the product owner, but it should be treated as an advanced capability rather than the headline value proposition. The App Store positioning, onboarding, primary navigation, and MVP priorities should all reflect this.

## Product Vision

ChapterCheck is a personal repository of favorite books and reading memories. It helps users:

- Save books they care about
- Organize those books in useful ways
- Capture notes and memorable passages
- Revisit thoughts years later
- Discuss books with other people without having to re-remember everything from scratch

This is closer to a personal knowledge companion for reading than a media locker.

## Product Positioning

### Category

Reading tracker + personal knowledge app for books

### Positioning Statement

For readers who want to remember their books long after finishing them, ChapterCheck is a personal book memory app that combines library tracking, notes, quotes, and searchable recall in one place.

Unlike Goodreads, it does not need to be social-first. Unlike simple reading trackers, it is designed around retrieval and reflection. Unlike audiobook library tools, it is not defined by file management.

## Target Users

### Primary User

A reader who:

- Reads multiple books per month or per year
- Often forgets details after finishing
- Wants notes, quotes, and summaries in one place
- Enjoys organizing books into shelves, tags, or themes
- Wants a better answer to "What did I think about that book?"

### Secondary User

A heavier audiobook user who:

- Listens while commuting, walking, or traveling
- Wants playback progress, quick note capture, and optional offline access
- May have personal audiobook files and wants them available in the same product

### Non-Primary User

A user looking mainly for:

- A public social network
- Marketplace purchasing
- Official publisher/distributor integrations
- Complex media-server style library administration

These may exist later, but they should not drive V1 product choices.

## Product Principles

1. Memory over media management
   ChapterCheck should optimize for recall, reflection, and retrieval before advanced file workflows.

2. Personal-first, social-second
   The product should be useful even if the user never follows, posts, or shares anything publicly.

3. Fast capture is essential
   If it is slow to add a book, save a note, or record a quote, users will not build the habit.

4. Retrieval matters as much as storage
   Saved notes are only valuable if users can find them later by text, theme, author, book, or time period.

5. Audiobook support is a power feature
   It should remain available, but not dominate the product story or main UI.

6. App Store V1 must feel coherent
   The first impression should clearly answer what the app is for and who it is for.

## Current Product Assessment

The current codebase already includes strong foundations:

- Books, authors, series, genres, shelves, reviews, search, and profiles
- Timestamped book notes
- Audiobook playback, downloads, and progress tracking
- Settings, themes, privacy controls, and offline behavior
- Web admin and import tooling

The current weakness is product coherence. The app reads as a mix of:

- Personal audiobook repository
- Reading tracker
- Social review app
- Private notes tool

Those pieces are individually reasonable, but the product story is not yet opinionated enough for App Store launch.

## Strategic Decision

### Decision

Ship ChapterCheck as a personal book memory app with audiobook support.

### Implications

- The home experience should center on the user's reading life, not uploaded audio files.
- Notes, quotes, summaries, and shelves should move closer to the center of the UX.
- User profiles and public discovery should be present but not primary.
- Audiobook upload and file management should live behind advanced workflows and power-user entry points.

## Core User Jobs

Users hire ChapterCheck to:

- Keep track of books they have read, are reading, or want to read
- Capture thoughts while reading or listening
- Save quotes and key takeaways
- Organize books into meaningful collections
- Search their past reading memory quickly
- Revisit books years later before conversations, recommendations, rereads, or writing

## Information Architecture Direction

Recommended top-level mental model:

1. Home
   Reading snapshot, continue reading/listening, recent notes, resurfaced books, yearly progress

2. Library
   All books with search, filters, statuses, tags, genres, shelves

3. Notes
   Recent notes, quotes, highlights, themes, note search, note collections

4. Goals / Activity
   Yearly goal, history, stats, streaks, completion by month, rereads

5. Profile / Settings
   Account, privacy, theme, advanced audio/download settings

Audiobook management should not be a top-level destination unless usage data later proves it deserves one.

## Keep / Change / Add / Cut

## Keep

These are aligned with the product vision and should remain:

- Book library and metadata
- Shelves and custom organization
- Search foundation
- Timestamped notes
- Reading progress and read status
- Ratings and reviews
- Offline support
- Audiobook playback
- Download support for personal use
- Privacy controls

## Change

These should remain, but their framing or UX should change:

- Home screen
  Change from listening-first to reading-memory-first.

- Search
  Expand from entity search to memory search across notes, quotes, takeaways, shelves, and themes.

- Book detail
  Make notes, quotes, summary, and discussion prep more central than audio file lists.

- Reviews
  Shift from public review emphasis toward personal reflection first, public sharing second.

- Profiles
  Treat as lightweight identity and sharing, not the center of the app.

- Audiobook upload/file management
  Keep for advanced users, but de-emphasize in onboarding and product story.

## Add

### Must Add Before App Store Launch

- Reading statuses:
  Want to Read, Reading, Finished, Paused, Did Not Finish, Reread

- Fast book capture:
  Search-to-add, manual add, ISBN/barcode scan, lightweight import path

- Note system expansion:
  Quotes, takeaways, themes, characters, discussion prompts, book summary

- Global retrieval:
  Search across note text, quote text, tags, shelves, genres, authors, and books

- Reading goals and stats:
  Annual goal, books finished this year, monthly history, favorite authors/genres

- Empty-state onboarding:
  Import books, add first book, create first shelf, save first note

- Consumer-safe account handling:
  Clear privacy model, account deletion path, understandable settings

### Strong Additions Soon After Launch

- Goodreads / StoryGraph / CSV import
- Shareable book summary or discussion card
- Book reminders or resurfacing:
  "You read this 3 years ago"
- Smart prompts:
  "What did you think of the ending?"
- Reread tracking
- Note tags and note collections

### Later Additions

- Buddy reads or lightweight collaboration
- Recommendation engine
- Richer social feeds
- Web clipper / Kindle-style import bridges

## Cut or De-Prioritize

These are not necessarily wrong, but they should not consume V1 focus:

- Public-profile-led growth loops
- User discovery as a primary behavior
- Complex storage-account concepts in user-facing UX
- Heavy admin-style audio file management surfaces
- Advanced social mechanics beyond simple sharing

## Feature Requirements

## 1. Library

Users must be able to:

- Add a book quickly
- Search and browse their books
- Filter by status, genre, shelf, author, series, year, format
- Sort by recent activity, title, rating, and completion date
- Mark a book as want-to-read, in progress, finished, paused, DNF, or reread
- View a complete reading history

Success criteria:

- A new user can add their first 10 books in under 5 minutes
- A returning user can find a known book in under 10 seconds

## 2. Book Memory

Each book should support:

- Personal summary
- Notes
- Quotes
- Themes
- Favorite moments
- Character notes
- Discussion prompts
- Personal review

Notes should support:

- Freeform entry
- Optional timestamps for audiobook users
- Optional categories or tags
- Searchability
- Sorting by recent, category, or book section

Success criteria:

- Users can answer "What did I think about this book?" from one screen
- Users can retrieve a past note by keyword without remembering which book it belonged to

## 3. Reading Progress and Goals

Users should be able to:

- Set a yearly reading goal
- Track finished books by month and year
- See progress over time
- Track rereads
- View personal reading stats

Success criteria:

- The product creates a sense of momentum without becoming a gamified distraction

## 4. Audiobook Support

Audiobook support remains in scope, but as a secondary layer.

Requirements:

- Continue listening
- Playback controls and progress syncing
- Offline downloads
- Timestamped note capture while listening
- Optional personal audiobook upload/import workflow

Non-requirement for positioning:

- The app does not need to market itself primarily as an audiobook file manager

UX principle:

- Users who never upload an audiobook file should still understand and love the app

## 5. Search and Retrieval

Search should support:

- Books
- Authors
- Series
- Shelves
- Notes
- Quotes
- Themes or tags

Recommended search modes:

- Quick global search
- Filtered search by content type
- Recent searches
- Saved searches later, not required for V1

Success criteria:

- The app feels like a usable memory archive, not just a catalog

## 6. Sharing and Social

V1 social should be light:

- Optional public profile
- Share a shelf
- Share a review
- Share a book summary or discussion card

Do not make feed engagement or user discovery a core dependency for retention.

## App Store MVP

The App Store MVP should communicate a simple, strong story:

ChapterCheck helps readers remember their books.

### MVP Scope

- Account creation / sign-in
- Add and import books
- Core library with statuses and shelves
- Book detail with notes, summary, quotes, and review
- Global search across books and notes
- Reading goal and yearly stats
- Continue reading/listening
- Basic audiobook playback and downloads
- Privacy and account management

### Not Required for MVP

- Rich social graph
- Recommendation engine
- Large-scale community features
- Heavy admin workflows
- Full cross-platform parity before launch

## Metrics

## Primary Product Metrics

- Weekly active users who open at least one book detail
- Weekly active users who save at least one note, quote, or summary
- Percentage of users with 10+ books in library
- 30-day retention
- Average books with attached memory content per user

## Secondary Metrics

- Book import completion rate
- Search-to-book-open success rate
- Goal setup rate
- Shelf creation rate
- Audiobook feature usage rate

## Quality Metrics

- Time to first book added
- Time to first note saved
- Crash-free sessions
- App Store rating

## Launch Risks

### 1. Positioning Risk

If the app appears to be mainly an audiobook uploader, mainstream readers may dismiss it immediately.

### 2. Scope Risk

If V1 tries to fully satisfy private knowledge management, social reading, and audiobook administration equally, quality will suffer.

### 3. Habit Risk

If adding books and notes is not frictionless, users will not create enough data for the app to become valuable.

### 4. Retrieval Risk

If users cannot reliably find old notes and thoughts, the core product promise fails.

## Recommended Release Strategy

## Phase 1: Product Coherence

- Rework positioning and onboarding
- Implement statuses and core book-memory model
- Expand search to notes and retrieval
- Redesign home around personal reading memory

## Phase 2: App Store Readiness

- Polish empty states and first-run UX
- Add goals and stats
- Tighten privacy/account flows
- Simplify or hide advanced audio-management surfaces

## Phase 3: Power Features

- Refine audiobook import/upload for personal use
- Add richer note tools
- Add better sharing assets

## Phase 4: Growth

- Imports from external services
- Recommendation and resurfacing systems
- Lightweight social improvements

## Open Questions

- Is ChapterCheck primarily for books in all formats, or should audiobooks remain a privileged format in the data model?
- Should quotes and notes be separate content types in V1, or can they share one flexible note model?
- Do shelves and tags both need to exist in V1, or should one be the primary organizational system?
- How much of the current public-profile model should survive the first App Store release?
- Is web an admin/import companion, or part of the consumer product story?

## Immediate Next Planning Output

The next document should translate this PRD into:

- A prioritized feature matrix: keep, cut, add, later
- User journeys for onboarding, adding books, saving notes, and retrieving old thoughts
- Revised information architecture for iOS
- A technical implementation roadmap mapped to the current repo
