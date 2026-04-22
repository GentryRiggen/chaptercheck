# Swap Notes and Messages in iOS Tab Bar

## Summary

Promote Notes from a Profile row to a top-level tab (position 4), and demote Messages from a top-level tab to a row inside the Profile view. Unread message badge counts move to the Profile tab icon and the Messages row.

## Current State

**Tab bar (5 tabs):**

1. Home (`house`)
2. Library (`books.vertical`)
3. Social (`person.2`)
4. Messages (`bubble.left.and.bubble.right`) — has unread badge
5. Profile (`person.crop.circle`)

**Profile view sections (own profile):**

1. Hero header
2. Shelves
3. Reviews
4. Reading History
5. My Notes row (`note.text`) — navigates to `NotesTabView()`

## Target State

**Tab bar (5 tabs):**

1. Home (`house`)
2. Library (`books.vertical`)
3. Social (`person.2`)
4. Notes (`pencil.and.notepad`) — no badge
5. Profile (`person.crop.circle`) — unread message badge count

**Profile view sections (own profile):**

1. Hero header
2. **Messages row** (`bubble.left.and.bubble.right`) — with unread count badge, navigates to `MessagesTabView()`
3. Shelves
4. Reviews
5. Reading History

## Detailed Changes

### MainTabView.swift

**Tab enum:**

- Replace `.messages` case with `.notes`

**Tab bar:**

- Replace Messages tab with Notes tab
  - View: `NotesTabView()`
  - Icon: `pencil.and.notepad`
  - Label: "Notes"
  - No badge
- Add unread message badge to Profile tab: `.badge(unreadMessageCount)`

**Subscriptions:**

- `subscribeToUnreadMessages()` stays in MainTabView unchanged
- `unreadMessageCount` state stays — now drives the Profile tab badge
- App icon badge number (`UIApplication.shared.applicationIconBadgeNumber`) continues as-is

### ProfileView.swift

**Remove:**

- "My Notes" section (lines 282-290, own profile only)

**Add (own profile only, after hero section, before Shelves):**

- "Messages" row with:
  - Icon: `bubble.left.and.bubble.right`
  - Label: "Messages"
  - Unread count badge (capsule style, same as current per-conversation badges)
  - NavigationLink destination: `MessagesTabView()`

**Unread count in ProfileView:**

- ProfileView (or its ViewModel) needs access to the total unread message count for the badge on the Messages row
- Options: pass from MainTabView via environment, or subscribe independently via `MessagingRepository().subscribeToUnreadCount()`

### No Changes Required

- `MessagesTabView` / `MessagesTabViewModel` — unchanged, just accessed from Profile navigation instead of tab
- `NotesTabView` / `NotesTabViewModel` — unchanged, just promoted to tab
- `AppDestination` enum — `.conversation()` and `.composeMessage` routes still work
- `ConversationView`, `ComposeMessageView` — unchanged
- Unread message subscription logic — unchanged
- App icon badge — unchanged

## Edge Cases

- **Deep linking:** DeepLinkRouter has no messages routes today (only books, authors, series, shelves, users), so no deep link changes needed.
- **MessagesTabView navigation stack:** When accessed as a pushed view inside Profile's NavigationStack (rather than owning its own), ensure its internal navigation (conversation list -> conversation detail) works correctly within Profile's stack. MessagesTabView currently wraps its own NavigationStack — this needs to be removed or adapted so it doesn't nest NavigationStacks.
