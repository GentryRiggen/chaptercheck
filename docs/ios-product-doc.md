# ChapterCheck iOS — Product Document

> Last updated: 2026-03-14
> Purpose: Pre-launch product reference covering every feature, technical architecture, and launch readiness assessment.

## Product Overview

ChapterCheck is a personal audiobook library manager with social features. Users upload their own audiobook files, organize them into shelves, listen with a full-featured player, take timestamped notes, and share activity with friends. The iOS app connects to a shared Convex real-time backend (also powering a Next.js web app).

**Target user:** Audiobook listeners who own DRM-free audiobook files and want a personal library manager with social and note-taking features — an alternative to siloed apps like Audible.

---

## Navigation Structure

5-tab layout with persistent mini player overlay:

| Tab         | Purpose                                                           |
| ----------- | ----------------------------------------------------------------- |
| **Home**    | Listening hub — hero card, continue listening, shelves, top rated |
| **Library** | Browse/search/filter full book catalog                            |
| **Social**  | Activity feeds (Following + Discover) and user search             |
| **Notes**   | Cross-book note management with search, tags, and filters         |
| **Profile** | User stats, shelves, reviews, reading history, settings           |

---

## Feature Inventory

### 1. Audio Player (Core Value Prop)

The player is the centerpiece — ~1,100 lines of `AudioPlayerManager` orchestrating AVPlayer, lock screen controls, audio session handling, and URL caching.

#### Playback Controls

- Play/pause, seek bar with undo (5s window for accidental drags)
- Skip forward (10/15/30/45/60s configurable) and backward (5/10/15/30s)
- **Momentum skipping** — rapid taps escalate: 15→30→60→120s, resets after 1.5s idle
- **Smart rewind** — 3-5s automatic rewind on resume after pause/background
- Playback speed: 0.5x–3.0x in 0.1x increments
- **Voice boost**: audio processing to even out narrator volume

#### Multi-Part Support

- Auto-advance to next part on completion
- Part selector sheet with durations and current-playing indicator
- Per-part download status badges

#### Now Playing Sheet (Full-Screen)

- Swipeable carousel: Page 1 = large artwork, Page 2 = book details card (rating, review, shelf links, author/series navigation)
- Transport controls with bottom toolbar: part selector, audio settings, sleep timer, add note, review

#### Sleep Timer

- 2×4 preset grid (5, 10, 15, 20, 30, 45, 60, 90 min)
- Active countdown with ±1/5/10/15/30/60 min adjustments

#### Lock Screen / Control Center

- Cover art, title, author, full playback controls, position scrubber

#### AirPods Integration

- Configurable double-click and triple-click actions (skip forward/back, next/prev part, disabled)

#### Progress Saving

- Auto-save every 10s during playback
- Immediate save on pause, background, part switch
- Offline queue (`OfflineProgressQueue` actor) flushes on reconnect
- Speed-adjusted time remaining display

#### Book Completion Flow

- Triggers "finished book" event → navigates to book detail
- Optional download cleanup confirmation

---

### 2. Offline / Download System

#### Download Management

- Download entire multi-part books to device
- Per-file progress tracking and status (pending/downloading/completed/failed)
- Files stored in `Documents/Downloads/{bookId}/` with JSON manifest
- Storage summary view with per-book breakdown and swipe-to-delete
- "Delete All" with confirmation

#### Download Preferences

- Auto-download on play (toggle) vs. show prompt
- Network preference: Wi-Fi only or Wi-Fi & Cellular
- After finishing a book: Ask / Auto-delete / Off

#### Offline Behavior (App-Wide)

- Downloaded books fully playable with no buffering
- Cached Convex data stays visible (stale but usable)
- Progress saves queued locally, flushed on reconnect
- Search, mutations, editing all gracefully disabled
- Offline banner shown in feeds
- Auto-recovery when network returns (WebSocket reconnects, queue flushes)

---

### 3. Library & Discovery

#### Book Browsing

- 2-column grid with covers, titles, authors
- Sort: Title A-Z/Z-A, Newest Added, Top Rated
- Genre multi-select filter (up to 50 results)
- Debounced search (300ms) with full-text search on title/author/description
- Infinite scroll, cursor-based pagination (20/page)

#### Unified Search

- Filter pills: All / Books / Authors / Series / Profiles
- Results grouped by type with counts
- Tap-through to detail views

#### Author Browsing

- 2-column grid, sort (A-Z, Z-A, Recent), search, infinite scroll
- Author detail: bio, books grid, book count

#### Series Detail

- Ordered book list (supports decimal ordering for novellas, e.g. 2.5)

#### Book Detail Screen

- Header: cover, title, author(s), series info
- Metadata: duration, year, language, ISBN, expandable description
- Reading status widget (Not Started / Currently Reading / Finished) with progress bar
- Community ratings + public reviews
- Your rating, review, and notes
- Audio files list with per-part play/download controls
- Shelf bookmark button → add-to-shelf sheet
- Download button with size estimation and progress

#### Add Book (Editor-Only)

- OpenLibrary search integration with cover thumbnails
- Pre-fills metadata from OpenLibrary (title, authors, ISBN, cover, description)
- Audio file upload: multi-file picker, drag-to-reorder, part numbering
- Formats: .m4a, .mp3, .flac, .opus

---

### 4. Shelves (Custom Organization)

- Create shelves with name, description, ordered/unordered toggle, public/private
- Shelf detail: book list with swipe-to-remove and drag-to-reorder (ordered shelves)
- Add books via search sheet with multi-select checkboxes
- Quick add-to-shelf modal from any book's bookmark button
- Shelf cards on profile with stacked cover art previews

---

### 5. Notes System

#### Two Note Types

- **Audio-anchored**: captured from player with start/end timestamps, linked to specific audio file + part. Can replay the audio snippet.
- **Freeform**: text-only, optional timestamps, optional source text

#### Entry Types

Quote, Paraphrase, Thought, Connection, Summary, and more.

#### Organization

- Search across all notes (debounced)
- Filter by entry type and tag (multi-select chips)
- Sort by book, date created, date modified
- View: flat timeline or grouped by book
- Stats ribbon: total count, breakdown by type, time period selector

#### Tags

- User-created, reusable across library
- Deterministic colors via DJB2 hash
- Multi-tag per note

#### Privacy

Public/private toggle per note. Public notes appear in social feeds.

---

### 6. Social Features

#### Activity Feeds (2-Tab)

- **Following**: real-time activity from people you follow
- **Discover**: community-wide public activity
- Activity types: reviews (with star rating), shelf adds, public notes
- Tap-through to books or user profiles

#### Follow System

- Follow/unfollow from any user profile
- Follower/following counts (clickable → paginated lists)
- User search by name

#### Privacy

- Profile privacy toggle (private profiles hidden from community feed)
- Server-side filtering (not just UI)

---

### 7. Profile

#### Own Profile

- Avatar, display name, privacy badge
- Stats: books read, reviews written, shelves created, followers, following
- Shelves section with stacked cover cards
- Recent reviews (3 shown, "Show All" → paginated list)
- Reading history (3 shown, "Show All" → paginated list)

#### Edit Profile

- Upload/change photo (camera, photos, remove)
- Name fields (first required, last optional)
- Email display + change
- Privacy toggle

#### Other User Profiles

- Same layout, follow button replaces edit
- Respects privacy settings (empty state if private)

---

### 8. Settings & Preferences

| Section       | Options                                                                                            |
| ------------- | -------------------------------------------------------------------------------------------------- |
| **Audio**     | Playback speed, voice boost, skip durations, momentum skipping, smart rewind, AirPods actions      |
| **Theme**     | Appearance (System/Light/Dark), accent color (12+ options with live preview)                       |
| **Downloads** | Storage summary, downloaded books list, auto-download toggle, network pref, post-completion        |
| **Account**   | Reload session, sign out (clears auth + downloads), delete account (email + password confirmation) |
| **Storage**   | Progress bar (used vs. 2TB limit), file count, warning at >90%                                     |
| **App Info**  | Version string                                                                                     |

---

### 9. Authentication

- Email OTP sign-in via Clerk (enter email → receive code → verify)
- Clerk JWT exchanged for Convex auth token (auto-refresh every 50s)
- Offline bypass: previously authenticated users can access app offline
- WebSocket recovery watchdog (5s timeout, auto-nudge, full session reset on failure)

---

### 10. Theme & Customization

- 12+ accent colors (Blue, Red, Purple, Teal, Green, Orange, Pink, Indigo, Cyan, Brown, Yellow, Gray)
- Color scheme: System / Light / Dark
- Persisted to UserDefaults (instant) + Convex (cross-device sync)
- No white flash on startup (cached before auth loads)

---

## Technical Architecture

| Layer       | Technology                                                              |
| ----------- | ----------------------------------------------------------------------- |
| UI          | SwiftUI, @Observable, NavigationStack                                   |
| State       | @Observable ViewModels, Combine publishers                              |
| Data        | Repositories → ConvexService (real-time subscriptions + mutations)      |
| Auth        | Clerk iOS SDK → Convex JWT                                              |
| Storage     | Cloudflare R2 via presigned URLs (50min TTL)                            |
| Audio       | AVPlayer + NowPlayingManager + AudioSessionManager                      |
| Offline     | DownloadService (actor) + OfflineProgressQueue (actor) + NetworkMonitor |
| Concurrency | @MainActor for UI, Actors for thread-safe caches/I/O                    |
| Config      | XcodeGen, iOS 26 target, Swift 5.10, no storyboards                     |

### Data Flow

```
Views → ViewModels → Repositories → ConvexService → Convex Backend
                                                      ↕
                                                 Cloudflare R2
```

- Repositories wrap `ConvexService.shared` — subscribe for real-time, mutation/action for writes
- ViewModels hold `AnyCancellable` subscriptions and expose `@Observable` state
- All numeric params passed as `Double` (Convex `v.number()` expects float64)

### Key Backend Tables

`users`, `books`, `authors`, `series`, `bookAuthors`, `audioFiles`, `storageAccounts`, `shelves`, `shelfBooks`, `bookUserData`, `listeningProgress`, `bookNotes`, `memoryTags`, `bookNoteTags`, `follows`, `genres`, `bookGenreVotes`, `userPreferences`

---

## Differentiating Features

1. **Momentum skipping** — escalating skip amounts on rapid taps
2. **Smart rewind** — automatic 3-5s rewind on resume
3. **Voice boost** — audio processing for narrator clarity
4. **Undo-able seek** — 5s window to undo accidental scrubs
5. **Audio-anchored notes** — timestamped captures with replay
6. **Speed-adjusted time remaining** — shows real time left at current speed
7. **Real-time cross-device sync** — progress, shelves, notes, preferences all via Convex
8. **Offline progress queue** — saves queued locally, flushed on reconnect
9. **Deterministic tag colors** — consistent colors from tag name hash
10. **Social activity feed** — reviews, shelf adds, and public notes from followed users

---

## Launch Readiness Assessment

### Strengths

- **Deep playback polish** — the player rivals commercial apps with momentum skipping, smart rewind, voice boost, sleep timer, and AirPods integration
- **Offline-first design** — downloads, progress queueing, graceful degradation, and automatic recovery are all built out
- **Real-time sync** — Convex subscriptions mean multi-device usage works seamlessly
- **Social layer** — activity feeds, follows, public notes give community value beyond solo listening
- **Notes system** — audio-anchored notes with tags and cross-book search is genuinely unique in the audiobook space

### Areas to Evaluate Before Launch

| #   | Area                             | Detail                                                                                                                                      |
| --- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Onboarding**                   | No walkthrough, feature tour, or empty-state guidance for new users with zero books. First-run experience may be confusing.                 |
| 2   | **Content bootstrapping**        | App requires editor permission to add books. How do new users get content? Is there an import flow, bulk upload, or admin-seeded catalog?   |
| 3   | **Permission model**             | Editor role gates book creation. What's the user journey for getting editor access? Invite-only, request-based, or automatic?               |
| 4   | **Rating scale**                 | ~~Appears to be 1-3 stars in the data layer.~~ Migrated to standard 1-5 star scale.                                                         |
| 5   | **Error messaging**              | Offline degradation is thorough, but are error states (failed uploads, failed downloads, auth errors) clear enough for non-technical users? |
| 6   | **App Store requirements**       | No Terms of Service, Privacy Policy screens, or App Tracking Transparency found. Required for App Store review.                             |
| 7   | **Push notifications**           | No push notification system. Social features and playback reminders would benefit from notifications.                                       |
| 8   | **Widget / Live Activity**       | No Lock Screen widget or Live Activity for current playback. Expected for media apps on iOS 26.                                             |
| 9   | **iPad support**                 | No iPad-specific layouts found. SwiftUI will run but may look stretched.                                                                    |
| 10  | **Accessibility depth**          | Labels exist but no evidence of full VoiceOver flow testing, rotor actions, or accessibility audit.                                         |
| 11  | **Analytics / crash reporting**  | No analytics or crash reporting SDK detected. Critical for post-launch iteration.                                                           |
| 12  | **Deep links / Universal Links** | No deep link handling found. Sharing a book or profile won't open the app.                                                                  |
| 13  | **Localization**                 | All strings hardcoded in English. No `.strings` files or localization infrastructure.                                                       |
| 14  | **Storage limits**               | 2TB limit shown in UI but unclear how this is enforced server-side or what happens when exceeded.                                           |
| 15  | **CarPlay**                      | No CarPlay support. Audiobook apps benefit significantly from CarPlay integration.                                                          |
