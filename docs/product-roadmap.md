# ChapterCheck Product Roadmap

## Status

Draft 2.0
Date: March 14, 2026
Companion to: [product-requirements.md](/Users/griggen/dev/code/personal/chaptercheck/docs/product-requirements.md)

## Purpose

This document turns the PRD into an execution plan for the current codebase.

It answers five questions:

1. What features do we keep, cut, change, or add?
2. What should the iOS app structure become?
3. What should be built first for App Store launch?
4. How does social fit into a personal-first product?
5. How does that map to the existing repo?

## Product Direction

ChapterCheck ships as a personal book memory app where the social layer makes the personal experience better.

That means:

- The core loop is add book → read or listen → save thoughts → retrieve later
- The main value is memory and organization — for you, first
- Social is the multiplier: see what friends think, discover through their shelves, get recommendations shaped by community taste
- Audiobook playback remains a power feature, not the headline
- The recommendation engine is the long-term moat — every rating, genre vote, status change, and shelf addition feeds it

## Social Philosophy

Social features serve the individual reader. The question is always: "Does this help someone remember, discover, or decide what to read next?"

What social means in ChapterCheck:

- **Ratings and genre tags are communal.** Everyone's ratings contribute to the book's score. Everyone's genre votes shape the taxonomy. This makes the catalog better for every user.
- **Friend activity is ambient.** You can see what friends are reading, their shelves, their ratings. You don't need to interact — just knowing is valuable.
- **Shelves are shareable.** A friend's "Best Sci-Fi 2025" shelf is a recommendation list without any algorithm.
- **Reviews are personal-first, public-second.** Write for yourself. Share if you want.
- **The recommendation engine grows with the community.** Every piece of user data makes suggestions smarter — but the engine is a later-phase investment that depends on having enough users and data first.

What social does NOT mean:

- No feed-first engagement loops
- No follower count as status
- No pressure to post or perform
- No content moderation burden at V1 scale

## Priority Matrix

### Keep Now

These are already useful and aligned with the product direction.

| Area           | Keep                                         | Notes                                     |
| -------------- | -------------------------------------------- | ----------------------------------------- |
| Library model  | Books, authors, series, genres, shelves      | Strong base already exists                |
| Reading state  | 5-state status, rating, review, privacy      | Already in Convex schema — surface in iOS |
| Notes          | 6 entry types, categories, memory tags       | Already in schema — decouple from audio   |
| Search         | Unified entity search and book search        | Expand to notes and social                |
| Audio          | Playback, progress, downloads, offline queue | Keep as power feature layer               |
| Privacy        | Profile, review, shelf, read-status privacy  | Keep granular model — it's well-designed  |
| Ratings        | Per-user ratings, aggregated average + count | Core social signal — make more visible    |
| Genre votes    | Democratic genre tagging per book            | Community-driven taxonomy — promote it    |
| Public shelves | User shelves with public/private toggle      | Foundation for social discovery           |
| Profiles       | Public profiles with stats, shelves, reviews | Exists — expand for friend context        |

### Change Soon

These exist today but need reframing or redesign.

| Area         | Current State                | Change Needed                                                 |
| ------------ | ---------------------------- | ------------------------------------------------------------- |
| Home         | Listening-first, no social   | Reading-memory-first with friend activity module              |
| Book detail  | Audio/review heavy           | Notes and summary central; community ratings/genres prominent |
| Search       | Entity-first                 | Memory retrieval + user/shelf discovery                       |
| Review model | Public-review flavored       | Personal reflection first, share toggle second                |
| Profiles     | Static, profile-centric only | Lightweight but useful — friend's reading life at a glance    |
| Audio upload | Feels core to product        | Move to advanced / settings entry points                      |
| Navigation   | Single stack, no tabs        | Tab bar with 5 destinations                                   |
| Notes UI     | Audio-timestamp-only in iOS  | Freeform notes with optional audio context                    |

### Add Before App Store Launch

| Feature                    | Why It Matters                   | Scope                                                                        |
| -------------------------- | -------------------------------- | ---------------------------------------------------------------------------- |
| Add book from iOS          | App is unusable without this     | OpenLibrary search → confirm → set status. Personal book catalog (see below) |
| Reading status in iOS UI   | Already in backend, not surfaced | Status picker, filters, history — no schema changes needed                   |
| Notes without audio        | Core product promise for readers | Make audioFileId optional, freeform note creation                            |
| Follow / friend system     | Required for social layer        | Follow users, see their public activity                                      |
| Friend activity on home    | Social discovery without effort  | "Friends are reading" module, recent friend reviews                          |
| Community ratings on books | Shows the app is alive           | Rating distribution, count, prominent display on book detail                 |
| Account deletion           | App Store hard requirement       | Clerk API + Convex cleanup — small but mandatory                             |
| Empty states everywhere    | Each new screen needs one        | Built alongside each feature, not batched at the end                         |

### Add Soon After Launch

| Feature                    | Why Soon                                                      |
| -------------------------- | ------------------------------------------------------------- |
| Search across notes/quotes | Delivers the recall promise                                   |
| Goals and yearly stats     | Market expectation for reading trackers                       |
| Goodreads / CSV import     | High leverage for onboarding — lets users bring their history |
| Notes hub destination      | First-class memory browsing and retrieval                     |
| Friend shelf browsing      | Social discovery — find your next read from a friend's shelf  |
| ISBN / barcode scan        | Fast capture upgrade — not required for V1 but high delight   |
| Resurfacing / reminders    | "You read this 2 years ago" — valuable once data exists       |

### Add Later (Recommendation Engine Era)

| Feature                              | Why Later                                                                    |
| ------------------------------------ | ---------------------------------------------------------------------------- |
| Recommendation engine                | Needs user data density first — ratings, genre votes, reading patterns       |
| "Users who liked X also liked Y"     | Collaborative filtering — needs critical mass                                |
| Smart suggestions based on shelves   | Shelf similarity scoring — depends on shelf diversity                        |
| Taste profiles and reading DNA       | Derived from accumulated genre votes, ratings, and reading patterns          |
| Social feed with algorithmic ranking | Only if organic social proves valuable — avoid building a feed nobody checks |
| Shareable discussion cards           | Growth layer after core workflows are solid                                  |

### De-Prioritize

| Area                         | Reason                                        |
| ---------------------------- | --------------------------------------------- |
| Storage-account UX           | Internal/admin concern, not consumer value    |
| Complex audio admin surfaces | Power users only — keep in settings           |
| Feed-first engagement loops  | Antithetical to the product philosophy        |
| Web consumer parity          | Web is admin/import for the next 6 months     |
| Review comments/threads      | Adds moderation burden without clear V1 value |

## Personal Book Catalog Design

Users should be able to add any book, but the shared catalog must stay clean.

### Two-tier model

1. **Global catalog** — Editor-curated, OpenLibrary-sourced, high-quality metadata. Shared across all users. Ratings, genre votes, and reviews aggregate here.
2. **Personal books** — User-created entries for books not in the global catalog. Only visible to the creator (and optionally friends). Editors can promote popular personal books to the global catalog.

### Add book flow

1. User taps "Add Book"
2. Search queries both global catalog AND OpenLibrary
3. **Match found in catalog?** → Link to it. Set status. Done.
4. **Match found in OpenLibrary only?** → Create global catalog entry from OL data. Link to it. Set status.
5. **No match?** → Create personal book with manual metadata (title, author, cover). User can still rate, shelve, and take notes.

### Why this works

- Global catalog stays clean — no user-submitted garbage
- Users are never blocked from adding a book
- Personal books still participate in shelves, notes, and the memory system
- Editors promote the best personal books, growing the catalog organically
- Recommendation engine can use personal book data too (title/author matching)

## Revised iOS Information Architecture

### Primary Navigation (Tab Bar)

1. Home
2. Library
3. Social
4. Notes
5. Profile

### Tab Intent

#### 1. Home

Purpose:
Your reading life at a glance — personal + social.

Key modules:

- Continue reading/listening (adaptive: shows reading or listening based on user behavior)
- Recent notes you've saved
- Progress toward yearly goal
- Friends are reading (ambient social — book covers + status from followed users)
- Recently finished by friends (lightweight review previews)
- Quick add book FAB

Current implementation base:

- [HomeView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeView.swift)
- [HomeViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeViewModel.swift)

Needed change:

- Add tab bar navigation (currently single stack)
- Redesign from listening-first to reading-memory-first
- Add friend activity modules
- Add quick-add entry point

#### 2. Library

Purpose:
Your books. Browse, organize, filter, add.

Key modules:

- Search your books
- Filter by status (want to read, reading, finished, paused, DNF)
- Filter by shelf, genre, author, format
- Sort by recent activity, title, completion date, rating
- Add book (primary entry point)
- Shelf management

Current implementation base:

- [LibraryView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Library/LibraryView.swift)
- [BookRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/BookRepository.swift)

Needed change:

- Add status-based filtering (backend status field exists, iOS doesn't use it)
- Add "Add Book" flow (search OL → confirm → status → shelf)
- Show personal books alongside global catalog books in the user's library

#### 3. Social

Purpose:
See what your people are reading. Discover through friends, not algorithms (until the recommendation engine is ready).

Key modules:

- Friend activity feed (who's reading/finished/rated what — chronological, not algorithmic)
- Friends' shelves (browsable public shelves from people you follow)
- Popular in your network (books with the most activity among your follows)
- Discover users (search, suggested based on reading overlap — later phase)

Current implementation base:

- Partial: profiles exist, public shelves exist, public reviews exist
- No following system
- No activity feed

Needed change:

- Build follower/following model
- Build activity feed query (status changes, ratings, reviews, shelf additions from followed users)
- Create Social tab screens
- Add "follow" action on profile views

#### 4. Notes

Purpose:
Your reading memory as a searchable, browsable collection.

Key modules:

- Recent notes across all books
- Filter by type (note, quote, takeaway, theme, character, discussion prompt)
- Filter by book, tag, date
- Search note text
- Quick note entry (pick a book, type, save)

Current implementation base:

- [BookNotesRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/BookNotesRepository.swift)
- Notes currently only accessible within book detail, tied to audio files

Needed change:

- Create standalone notes hub
- Make notes work without audio context (audioFileId optional)
- Add cross-book note search
- Add quick-capture entry point

#### 5. Profile

Purpose:
Your reading identity. Account, stats, settings, and your public face.

Sections:

- **Your stats**: Books read, reviews written, shelves, reading pace
- **Your shelves**: All shelves with public/private indicators
- **Reading history**: Timeline of status changes
- **Reviews you've written**: Your reviews across all books
- **Goals**: Yearly goal progress, monthly history
- **Settings**: Account, privacy, theme, downloads, audio, account deletion
- **Following / Followers**: People you follow and who follows you

Current implementation base:

- [ProfileView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Profile/ProfileView.swift)
- [SettingsView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Settings/SettingsView.swift)

Needed change:

- Merge profile and settings into one tab
- Add goals/stats section
- Add following/followers lists
- Add account deletion

## Revised Book Detail Structure

The book detail is the center of the product. It answers: "What do I think about this book, and what does everyone else think?"

### Section order

1. **Header**: Cover, title, author(s), series position
2. **Status + actions**: Reading status picker, play/resume (if audio), add to shelf
3. **Community signal**: Average rating with distribution, genre tags (vote counts), rating count
4. **Your memory**: Personal summary, your rating, your review
5. **Your notes**: Notes, quotes, takeaways — grouped by type, sorted by recency
6. **Community reviews**: Other users' public reviews (sorted by helpful/recent)
7. **Friends on this book**: Which friends have read it, their ratings (if public)
8. **Shelves**: Which of your shelves contain this book
9. **Audio**: Audio files, playback controls, progress (collapsed by default if user hasn't uploaded audio)

Current implementation base:

- [BookDetailView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailView.swift)
- [BookDetailViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailViewModel.swift)

Key changes:

- Promote community ratings and genre tags much higher
- Add "Friends on this book" section
- Add personal summary and note sections above community reviews
- Collapse audio section by default — expand when relevant
- Add status picker prominently near the top

## User Journey Priorities

### Journey 1: New User Onboarding

Goal:
Get the user to experience both personal and social value in the first session.

Target flow:

1. Create account
2. "Find friends" prompt (search by name, or skip)
3. Add first books (search or browse popular)
4. Set reading statuses
5. Create first shelf or save first note
6. See a friend's shelf or a community rating

Definition of success:

- User adds at least 3 books
- User sets at least 1 status
- User follows at least 1 person OR saves at least 1 note

### Journey 2: Add a Book Fast

Goal:
Minimize friction. Any user, any book, under 20 seconds.

Target flow:

1. Tap add (FAB on home or button in library)
2. Search title/author — results from global catalog + OpenLibrary
3. Tap a match → confirm metadata
4. Set status (defaults to "Want to Read")
5. Optional: add to shelf
6. Done — book appears in library immediately

No match flow:

1. "Can't find it? Add manually"
2. Enter title, author, optional cover photo
3. Creates personal book entry
4. Same status + shelf flow

Definition of success:

- Under 20 seconds for a known book via search
- Under 45 seconds for a manual entry
- Zero books require editor intervention

### Journey 3: Save a Thought While Reading or Listening

Goal:
Make capture easy enough to become a habit.

Target flow (from book detail):

1. Open book → tap "Add Note"
2. Choose type (note, quote, takeaway — defaults to note)
3. Type text
4. Optional: add tag, assign category
5. Save

Target flow (from audio player):

1. Tap note icon in Now Playing
2. Audio timestamp auto-attached
3. Type text
4. Save — note appears on book with timestamp

Target flow (from Notes tab):

1. Tap "+" in Notes tab
2. Pick a book (recent books shown first)
3. Type text, choose type
4. Save

Definition of success:

- Note saved in under 10 seconds from any entry point
- Notes work identically for audio and non-audio books

### Journey 4: Retrieve an Old Thought

Goal:
Deliver the product promise of long-term recall.

Target flow:

1. Go to Notes tab or use global search
2. Search by keyword, or browse by book/type/tag
3. View note in context (which book, when saved, what type)
4. Tap to jump to book detail
5. Read personal summary to refresh full memory

Definition of success:

- User can find a past note without remembering the book title
- Search returns results across notes, quotes, and takeaways

### Journey 5: Discover What Friends Are Reading

Goal:
Find your next read through people you trust, not an algorithm.

Target flow:

1. Open Social tab
2. See friend activity: "Alex finished Dune, rated 4.5" / "Sam added Project Hail Mary to 'Best Sci-Fi'"
3. Tap a book → see book detail with community ratings and friend activity
4. Add to your library with "Want to Read" status
5. Browse a friend's shelf → find 3 more books to add

Definition of success:

- User discovers and adds at least 1 book through friend activity
- User can browse any friend's public shelves within 2 taps from Social tab

### Journey 6: Rate and Tag a Book You Finished

Goal:
Every finished book contributes to the community knowledge and feeds the future recommendation engine.

Target flow:

1. Mark book as "Finished"
2. Prompted: "How would you rate it?" (star rating)
3. Prompted: "What genres fit?" (existing genre tags + add new)
4. Optional: write a review, save a summary
5. Rating and genre votes immediately reflected in book's community stats

Definition of success:

- 60%+ of books marked "Finished" get a rating within the same session
- Genre votes accumulate enough to show meaningful consensus (3+ votes per genre per book)

## Technical Roadmap by Phase

### Phase 1: Core Foundation

Objective:
Make the app usable as a book library with reading status. Ship account deletion. Add tab navigation.

This phase has zero backend schema changes — everything needed already exists.

Work:

- Add tab bar navigation to MainTabView (Home, Library, Social placeholder, Notes placeholder, Profile)
- Update Swift `BookUserData` model to decode full status enum from Convex
- Build reading status picker UI (want to read, reading, finished, paused, DNF)
- Wire status into BookDetailView and LibraryView filters
- Build "Add Book" flow: search OpenLibrary → confirm → create/link → set status
- Add personal books table to schema (user-owned, not in global catalog)
- Add account deletion to Settings (Clerk API + Convex user cleanup)
- Empty states for all new screens

Likely touchpoints:

- [MainTabView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Navigation/MainTabView.swift)
- [AppDestination.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Navigation/AppDestination.swift)
- [BookUserData.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Models/BookUserData.swift)
- [BookDetailView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailView.swift)
- [BookDetailViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailViewModel.swift)
- [LibraryView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Library/LibraryView.swift)
- [SettingsView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Settings/SettingsView.swift)
- New: `AddBookView.swift`, `AddBookViewModel.swift`
- New: personal books schema + mutations

### Phase 2: Notes Without Audio + Book Detail Rework

Objective:
Make the memory system work for all readers, not just audiobook users. Redesign book detail around the new product story.

Work:

- Make `audioFileId` optional in bookNotes (or confirm it already is)
- Build freeform note creation flow (pick type, type text, save)
- Redesign book detail section order: status → community signal → your memory → your notes → community reviews → audio
- Promote community ratings and genre vote counts on book detail
- Add personal summary field to book detail UI (field exists in `bookUserData.personalSummary`)
- Ensure note creation works from book detail without audio context

Likely touchpoints:

- [schema.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/schema.ts) (bookNotes audioFileId optionality)
- `packages/convex-backend/convex/bookNotes/*`
- [BookNotesRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/BookNotesRepository.swift)
- [BookDetailView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailView.swift)
- [BookDetailViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailViewModel.swift)

### Phase 3: Social Foundation

Objective:
Add the follow system and friend activity so the Social tab comes alive.

Work:

- Add `follows` table to Convex schema (followerId, followingId, createdAt)
- Add follow/unfollow mutations with privacy respect
- Build friend activity query: status changes, ratings, reviews, shelf additions from followed users (chronological)
- Build Social tab: activity feed + friends' shelves section
- Add "Follow" button on profile views
- Add "Friends on this book" section to book detail (which friends have read/rated it)
- Add "Friends are reading" module to Home tab

Likely touchpoints:

- [schema.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/schema.ts) (new follows table)
- New: `packages/convex-backend/convex/follows/*` (mutations, queries)
- New: `packages/convex-backend/convex/activity/*` (friend activity feed query)
- New: `SocialView.swift`, `SocialViewModel.swift`, `ActivityFeedView.swift`
- [ProfileView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Profile/ProfileView.swift)
- [BookDetailView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailView.swift)
- [HomeView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeView.swift)

### Phase 4: Notes Hub + Search Expansion

Objective:
Make notes a first-class destination. Make old thoughts findable.

Work:

- Build Notes tab: recent notes across all books, filter by type/book/tag/date
- Add full-text search index on `bookNotes.noteText`
- Expand search to include notes, quotes, and shelves alongside books/authors/series
- Add search filters by content type
- Add recent searches
- Add quick-capture from Notes tab (pick book → type → save)

Likely touchpoints:

- [search/queries.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/search/queries.ts)
- `packages/convex-backend/convex/bookNotes/queries.ts` (add search + cross-book queries)
- [SearchRepository.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Repositories/SearchRepository.swift)
- [SearchView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Search/SearchView.swift)
- New: `NotesHubView.swift`, `NotesHubViewModel.swift`

### Phase 5: Home Rework + Goals

Objective:
Make Home represent the product correctly — personal reading life with social context.

Work:

- Redesign Home with adaptive modules:
  - Continue reading/listening (based on user behavior, not always audio-first)
  - Your recent notes
  - Yearly goal progress
  - Friends are reading (from Phase 3)
  - Recently finished by friends
  - Quick add book
- Add yearly reading goal (set in Profile/Settings, displayed on Home)
- Add monthly completion history
- Add basic reading stats (books by genre, by month, pace)

Likely touchpoints:

- [HomeView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeView.swift)
- [HomeViewModel.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeViewModel.swift)
- New: goals table or `userPreferences` extension in schema
- New: stats aggregation queries

### Phase 6: App Store Readiness

Objective:
Polish, compliance, and coherence check.

Work:

- Onboarding flow: add books → follow friends → set goal → save first note
- Improve all empty states (each should guide toward the next action)
- Review privacy language and settings clarity
- Ensure non-audio users have a complete path through every tab
- App Store metadata, screenshots, and description
- Tighten first-run experience
- "Rate finished book" prompt (drives rating density for community signal + future recommendations)

Likely touchpoints:

- New: `OnboardingView.swift` flow
- [SettingsView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Settings/SettingsView.swift)
- App Store assets (outside repo)

### Phase 7: Import + Enrichment

Objective:
Let existing readers bring their history. Start building the data foundation for recommendations.

Work:

- Goodreads CSV import (books, ratings, shelves, reading dates)
- StoryGraph CSV import
- ISBN/barcode scan for fast capture
- "Rate finished book" nudge on status change (drives data density)
- Begin tracking implicit signals for future recommendation engine: time on book detail, shelf co-occurrence, rating patterns

Likely touchpoints:

- New: import action in Convex (parse CSV, create books/bookUserData)
- New: `ImportView.swift` in Settings or Library
- Camera/barcode scanning (AVFoundation or VisionKit)

### Phase 8: Recommendation Engine (Future)

Objective:
Turn accumulated user data into smart book discovery.

Depends on:

- Enough users with rated books (target: 100+ users with 20+ ratings each)
- Genre vote density (3+ votes per genre per active book)
- Shelf diversity (users creating themed shelves)

Approach:

- Collaborative filtering: "users who rated similarly to you also liked..."
- Content-based: genre vote overlap, author affinity, series completion patterns
- Social proximity: weight recommendations from users you follow more heavily
- Shelf similarity: find users with similar shelf compositions

This phase is a significant engineering investment. It should be planned as a dedicated project once the data foundation exists, not bolted on incrementally.

## Repo Mapping Summary

### Backend

Primary areas likely to change:

- [schema.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/schema.ts) — personal books table, follows table, goals
- `packages/convex-backend/convex/bookUserData/*` — status queries, rating prompts
- `packages/convex-backend/convex/bookNotes/*` — optional audioFileId, cross-book queries, search index
- [search/queries.ts](/Users/griggen/dev/code/personal/chaptercheck/packages/convex-backend/convex/search/queries.ts) — note search, shelf search
- New: `packages/convex-backend/convex/follows/*` — follow/unfollow, friend queries
- New: `packages/convex-backend/convex/activity/*` — friend activity feed
- New: `packages/convex-backend/convex/import/*` — CSV import actions

### iOS

Primary areas likely to change:

- [MainTabView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Navigation/MainTabView.swift) — tab bar navigation
- [AppDestination.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Navigation/AppDestination.swift) — new destinations
- [HomeView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Home/HomeView.swift) — full redesign
- [LibraryView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Library/LibraryView.swift) — status filters, add book
- [BookDetailView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/BookDetail/BookDetailView.swift) — full redesign
- [SearchView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Search/SearchView.swift) — expanded search
- [ProfileView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Profile/ProfileView.swift) — goals, follows, settings merge
- [SettingsView.swift](/Users/griggen/dev/code/personal/chaptercheck/apps/ios/ChapterCheck/Features/Settings/SettingsView.swift) — account deletion
- New: `Features/Social/` — SocialView, ActivityFeedView, FriendShelvesView
- New: `Features/Notes/` — NotesHubView
- New: `Features/AddBook/` — AddBookView, AddBookViewModel
- New: `Features/Onboarding/` — OnboardingView

### Web

Primary role:

- Admin, import, and content management only for the next 6 months
- Do not invest in web consumer parity before iOS App Store launch
- Reassess after iOS product is coherent and has users

## Decisions Made in This Document

These were open questions in the PRD. They are now decided:

1. **Quotes and notes share one model.** The `bookNotes` table with `entryType` discrimination handles all memory types. Ship with this.
2. **Shelves and tags both exist.** Shelves are curated collections. Tags are cross-cutting labels. The schema already has both. Ship with both.
3. **Web is admin-only for V1.** No web consumer features until iOS ships and has users.
4. **Personal books are separate from the global catalog.** Users can add any book without polluting the curated catalog. Editors promote standout entries.
5. **Social is personal-first.** Friend activity and community signal enrich the individual experience. No feed-engagement optimization.
6. **Rating scale is 1-5 stars.** Standard 5-star scale for familiarity. Existing 1-3 ratings migrated (1→2, 2→3, 3→5).
7. **Recommendation engine is Phase 8.** Build the data foundation first (ratings, genres, follows, shelves), invest in the engine only when there's enough signal.

## Suggested Next Deliverables

1. Schema diff for Phase 1: personal books table, any needed index changes
2. iOS screen designs for tab bar navigation and Add Book flow
3. iOS screen design for new Book Detail section order
4. Milestone-based implementation checklist for Phase 1
5. App Store launch checklist (compliance, metadata, screenshots)
