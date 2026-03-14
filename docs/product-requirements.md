# ChapterCheck Product Requirements

## Status

Draft 2.0
Date: March 14, 2026
Owner: Product discovery

## Executive Summary

ChapterCheck ships to the App Store as a personal book memory app where social makes the personal experience better.

The core promise is:

> Remember what you read, why it mattered, and what to say about it later — and discover what the people you trust are reading.

The app helps users build a private, organized, searchable record of their reading life: books, notes, quotes, reactions, takeaways, shelves, and progress. Community ratings, genre tags, and friend activity enrich every book and help users discover what to read next.

Audiobook playback remains a powerful capability for users who need it, but the product story leads with memory and discovery, not file management.

## Product Vision

ChapterCheck is a personal reading companion with a taste-driven social layer. It helps users:

- Save books they care about
- Organize those books in useful ways
- Capture notes and memorable passages
- Revisit thoughts years later
- See what friends are reading and what they thought
- Discover their next great book through people, not algorithms
- Discuss books without re-remembering everything from scratch

The social layer is designed to be ambient and useful — it enriches the personal experience without requiring participation.

## Product Positioning

### Category

Reading tracker + personal knowledge app + social book discovery

### Positioning Statement

For readers who want to remember their books and discover what to read next, ChapterCheck is a personal book memory app that combines library tracking, notes, quotes, searchable recall, and friend-powered discovery in one place.

Unlike Goodreads, it is personal-first — the social layer serves you, not an engagement algorithm. Unlike simple reading trackers, it is designed around retrieval and reflection. Unlike audiobook library tools, it is not defined by file management.

## Target Users

### Primary User

A reader who:

- Reads multiple books per month or per year
- Often forgets details after finishing
- Wants notes, quotes, and summaries in one place
- Enjoys organizing books into shelves, tags, or themes
- Wants a better answer to "What did I think about that book?"
- Cares what friends are reading and values their taste

### Secondary User

A heavier audiobook user who:

- Listens while commuting, walking, or traveling
- Wants playback progress, quick note capture, and optional offline access
- May have personal audiobook files and wants them available in the same product

### Non-Primary User

A user looking mainly for:

- A feed-first social network
- Marketplace purchasing
- Official publisher/distributor integrations
- Complex media-server style library administration

These may exist later, but they should not drive V1 product choices.

## Product Principles

1. Memory over media management
   ChapterCheck should optimize for recall, reflection, and retrieval before advanced file workflows.

2. Personal-first, social-as-multiplier
   The product should be fully useful if the user never follows anyone. But following friends should make it meaningfully better — better discovery, richer book detail pages, ambient awareness of reading culture.

3. Fast capture is essential
   If it is slow to add a book, save a note, or record a quote, users will not build the habit.

4. Retrieval matters as much as storage
   Saved notes are only valuable if users can find them later by text, theme, author, book, or time period.

5. Community signal improves every book
   Ratings, genre tags, and reviews from other users make the catalog more useful. Every interaction makes the product smarter.

6. Audiobook support is a power feature
   It should remain available, but not dominate the product story or main UI.

7. App Store V1 must feel coherent
   The first impression should clearly answer what the app is for and who it is for.

8. Build for the recommendation engine
   Every feature that generates user preference data (ratings, genre votes, shelves, statuses, follows) is an investment in the long-term moat: personalized book recommendations.

## Current Product Assessment

The current codebase already includes strong foundations:

- Books, authors, series, genres, shelves, reviews, search, and profiles
- 5-state reading status model (want_to_read, reading, finished, paused, dnf) in backend schema
- 6 note entry types (note, quote, takeaway, theme, character, discussion_prompt) in backend schema
- Memory tags system in backend schema
- Audiobook playback, downloads, and progress tracking
- Public profiles with stats, shelves, and reviews
- Public/private shelves, review privacy, profile privacy
- Community ratings with per-book aggregation
- Democratic genre voting per book
- Settings, themes, privacy controls, and offline behavior
- Web admin and import tooling

The current gaps:

- iOS does not surface the 5-state reading status (still uses binary isRead)
- iOS notes are audio-locked (no freeform note creation for non-audio books)
- No way to add a book from iOS (only web admin)
- No follow/friend system
- No friend activity feed
- No Social tab or friend-oriented discovery
- No account deletion (App Store requirement)
- No reading goals or stats destination
- Navigation is single-stack, not tabbed

## Strategic Decision

### Decision

Ship ChapterCheck as a personal book memory app with a social discovery layer and audiobook support.

### Implications

- The home experience centers on the user's reading life with ambient friend activity.
- Notes, quotes, summaries, and shelves are the center of the UX.
- Community ratings and genre tags are prominent on every book — they make the catalog useful.
- Friend activity is available but never pressuring.
- Audiobook upload and file management live behind advanced workflows.
- Every user interaction feeds the future recommendation engine.

## Core User Jobs

Users hire ChapterCheck to:

- Keep track of books they have read, are reading, or want to read
- Capture thoughts while reading or listening
- Save quotes and key takeaways
- Organize books into meaningful collections
- Search their past reading memory quickly
- See what friends are reading and how they rated books
- Discover what to read next through friend shelves and community signal
- Revisit books years later before conversations, recommendations, rereads, or writing

## Information Architecture Direction

Recommended top-level navigation:

1. Home
   Reading snapshot, continue reading/listening, recent notes, friend activity, yearly progress

2. Library
   Your books with search, filters, statuses, genres, shelves, add book

3. Social
   Friend activity feed, friends' shelves, popular in your network

4. Notes
   Recent notes, quotes, highlights, themes, note search, quick capture

5. Profile
   Your stats, goals, shelves, reviews, following/followers, settings

## Keep / Change / Add / Cut

### Keep

These are aligned with the product vision and should remain:

- Book library and metadata
- Shelves and custom organization (public + private)
- Search foundation
- Timestamped notes (6 entry types + categories + tags — already in schema)
- 5-state reading status (already in schema)
- Ratings and reviews with privacy controls
- Community rating aggregation
- Democratic genre voting
- Public profiles with stats
- Offline support
- Audiobook playback
- Download support for personal use
- Granular privacy controls (profile, review, shelf, read-status)

### Change

These should remain, but their framing or UX should change:

- Home screen
  Change from listening-first to reading-memory-first with friend activity.

- Search
  Expand from entity search to memory search across notes, quotes, takeaways, shelves, and themes. Add user discovery.

- Book detail
  Make community signal (ratings, genres), personal memory (notes, summary), and friend context more central than audio file lists.

- Reviews
  Shift from public review emphasis toward personal reflection first, share toggle second.

- Profiles
  Expand to show reading activity useful to friends — not vanity metrics, but what they're reading and what they thought.

- Audiobook upload/file management
  Keep for advanced users, but de-emphasize in onboarding and product story.

- Navigation
  Move from single stack to tab bar with 5 destinations.

### Add

#### Must Add Before App Store Launch

- Add book from iOS:
  Search global catalog + OpenLibrary → link or create → set status. Personal book entries for books not in catalog.

- Reading status UI on iOS:
  Surface the 5-state model that already exists in the backend.

- Notes without audio:
  Freeform note creation for all books, not just those with audio files.

- Follow system:
  Follow users, see their public reading activity.

- Friend activity:
  Social tab with friend status changes, ratings, reviews, shelf additions.

- Community signal on book detail:
  Rating distribution, genre vote counts, friend ratings prominently displayed.

- Account deletion:
  App Store hard requirement. Clerk API + Convex user cleanup.

- Empty states:
  Built alongside each feature — guide users toward the next action.

#### Strong Additions Soon After Launch

- Search across notes and quotes
- Notes hub as a standalone destination
- Reading goals and yearly stats
- Goodreads / StoryGraph / CSV import
- ISBN/barcode scan for fast capture
- Friend shelf browsing
- Book resurfacing reminders
- "Rate this book" prompt on status change to Finished

#### Later Additions (Recommendation Engine Era)

- Collaborative filtering recommendations ("readers like you also enjoyed...")
- Content-based recommendations (genre, author, series affinity)
- Social-proximity-weighted suggestions
- Taste profiles and reading DNA
- Shareable discussion cards

### Cut or De-Prioritize

These should not consume V1 focus:

- Feed-first engagement loops (algorithmic ranking, engagement optimization)
- Complex storage-account concepts in user-facing UX
- Heavy admin-style audio file management surfaces
- Web consumer parity (web stays admin-only for 6 months)
- Review comments/threads (moderation burden without clear V1 value)
- Follower count as status signal

## Feature Requirements

### 1. Library

Users must be able to:

- Add a book quickly (search global catalog + OpenLibrary, or create personal entry)
- Search and browse their books
- Filter by status, genre, shelf, author, series, year, format
- Sort by recent activity, title, rating, and completion date
- Mark a book as want-to-read, reading, finished, paused, DNF, or reread
- View a complete reading history

Personal book catalog:

- Users can create personal book entries for titles not in the global catalog
- Personal books are only visible to the creator (and optionally friends)
- Editors can promote popular personal books to the global catalog
- Global catalog stays curated and clean

Success criteria:

- A new user can add their first 10 books in under 5 minutes
- A returning user can find a known book in under 10 seconds
- Zero books require editor intervention to add

### 2. Book Memory

Each book should support:

- Personal summary
- Notes (freeform, not audio-locked)
- Quotes
- Themes
- Favorite moments
- Character notes
- Discussion prompts
- Personal review and rating

Notes should support:

- Freeform entry (default path)
- Optional timestamps for audiobook users
- Optional categories or tags
- Searchability
- Sorting by recent, type, or book section

Success criteria:

- Users can answer "What did I think about this book?" from one screen
- Users can retrieve a past note by keyword without remembering which book it belonged to
- Note capture works identically for audio and non-audio books

### 3. Reading Progress and Goals

Users should be able to:

- Set a yearly reading goal
- Track finished books by month and year
- See progress over time
- Track rereads
- View personal reading stats (by genre, author, format, month)

Success criteria:

- The product creates a sense of momentum without becoming a gamified distraction

### 4. Social and Discovery

Community signal on every book:

- Average rating with distribution across all users
- Genre tags with vote counts (democratic taxonomy)
- Review count and public reviews
- Which of your friends have read it and their ratings

Friend activity:

- Follow other users
- See friend status changes, ratings, reviews, and shelf additions
- Browse friends' public shelves as recommendation lists
- "Popular in your network" based on recent friend activity

Privacy model:

- All social features respect existing privacy controls
- Profile privacy, review privacy, shelf privacy, read-status privacy remain granular
- Private profiles are not discoverable, private reviews not shown, private shelves not visible
- Users who never follow anyone still get full value from the personal features

Success criteria:

- Users discover and add at least 1 book through friend activity per month
- 60%+ of books marked "Finished" get a rating (feeds community signal + future recommendations)
- Genre votes accumulate enough for meaningful consensus (3+ votes per active book)

### 5. Audiobook Support

Audiobook support remains in scope as a power feature.

Requirements:

- Continue listening
- Playback controls and progress syncing
- Offline downloads
- Timestamped note capture while listening
- Optional personal audiobook upload/import workflow

Non-requirement for positioning:

- The app does not market itself primarily as an audiobook file manager

UX principle:

- Users who never upload an audiobook file should still understand and love the app
- Audio features appear contextually (when a book has audio files) rather than as permanent UI

### 6. Search and Retrieval

Search should support:

- Books
- Authors
- Series
- Shelves (your own + public)
- Users (for following)
- Notes and quotes (cross-book)
- Themes or tags

Recommended search modes:

- Quick global search
- Filtered search by content type
- Recent searches
- Saved searches later, not required for V1

Success criteria:

- The app feels like a usable memory archive, not just a catalog
- Users can find people to follow through search

### 7. Recommendation Engine (Future)

The long-term moat. Every V1 feature generates data that feeds this:

- Ratings → taste similarity between users
- Genre votes → content preferences
- Shelves → thematic groupings and co-occurrence
- Reading status patterns → reading velocity and genre appetite
- Follow graph → social proximity for weighting
- Time-on-book-detail → implicit interest signals

The engine itself is a Phase 8 investment requiring critical mass (100+ active users with 20+ ratings each). But every earlier phase should be designed to generate clean, useful signal.

## App Store MVP

The App Store MVP communicates:

ChapterCheck helps readers remember their books and discover what friends are reading.

### MVP Scope

- Account creation / sign-in
- Add books (search + manual)
- Core library with statuses, shelves, and filters
- Book detail with notes, summary, community ratings, genre tags, and friend context
- Follow system and friend activity feed
- Global search across books, users, and notes
- Continue reading/listening
- Basic audiobook playback and downloads
- Privacy and account management (including deletion)
- Empty states that guide new users

### Not Required for MVP

- Recommendation engine
- Goodreads/StoryGraph import
- Reading goals and stats (soon after launch)
- ISBN/barcode scanning
- Full cross-platform parity

## Metrics

### Primary Product Metrics

- Weekly active users who open at least one book detail
- Weekly active users who save at least one note, quote, or summary
- Percentage of users with 10+ books in library
- 30-day retention
- Average books with attached memory content per user
- Percentage of users who follow at least 1 other user
- Books added through friend activity discovery

### Secondary Metrics

- Book add completion rate (search → confirm → status)
- Search-to-book-open success rate
- Follow rate (profile views → follows)
- Rating rate on finished books
- Genre vote rate
- Shelf creation rate
- Audiobook feature usage rate

### Quality Metrics

- Time to first book added
- Time to first note saved
- Time to first follow
- Crash-free sessions
- App Store rating

### Recommendation Engine Readiness Metrics (track from V1)

- Users with 20+ ratings
- Books with 10+ ratings
- Genre votes per active book
- Average shelf size
- Follow graph density

## Launch Risks

### 1. Positioning Risk

If the app appears to be mainly an audiobook uploader, mainstream readers will dismiss it immediately.

### 2. Scope Risk

If V1 tries to fully satisfy personal knowledge management, social reading, and audiobook administration equally, quality will suffer.

### 3. Habit Risk

If adding books and notes is not frictionless, users will not create enough data for the app to become valuable.

### 4. Retrieval Risk

If users cannot reliably find old notes and thoughts, the core product promise fails.

### 5. Social Cold Start Risk

If users sign up alone and see an empty Social tab, the social value is invisible. Mitigation: personal features must be fully compelling without social. Social is additive, never required.

### 6. Data Density Risk

If users don't rate books and vote on genres, community signal stays thin and the recommendation engine has nothing to work with. Mitigation: prompt ratings on status change to Finished; make genre voting easy and visible.

## Decisions Made

1. **Quotes and notes share one model.** The `bookNotes` table with `entryType` discrimination handles all memory types.
2. **Shelves and tags both exist.** Shelves are curated collections. Tags are cross-cutting labels.
3. **Web is admin-only for V1.** No web consumer features until iOS ships and has users.
4. **Personal books are separate from the global catalog.** Users can add any book without polluting the curated catalog.
5. **Social is personal-first.** Friend activity enriches the individual experience. No feed-engagement optimization.
6. **Rating scale stays 1-3 for now.** Simpler scale = faster rating = more data. Revisit after launch.
7. **Recommendation engine is a later investment.** Build the data foundation now, invest in the engine when there's enough signal.

## Immediate Next Planning Output

See [product-roadmap.md](/Users/griggen/dev/code/personal/chaptercheck/docs/product-roadmap.md) for the execution plan.
