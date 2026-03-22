# Admin Section Expansion — Design Document

## Overview

Expand the web admin section from a single user management page into a dedicated admin space with sidebar navigation, enhanced user management (search, delete, suspend), and storage account management.

## Admin Shell

- Sidebar navigation with two items: **Users**, **Storage**
- Current admin page becomes `/admin/users`; new `/admin/storage` page
- Sidebar only shows these two items — no placeholders for future sections

## Users Page (`/admin/users`)

### Layout

- **Tab bar:** All / Active / Pending / Suspended (no counts on tabs)
- **Search bar:** Server-side full-text search via Convex search index on users
- **Filter dropdown:** By role (Admin / Editor / Viewer / All)
- Search and filters operate within the selected tab; switching tabs re-runs the current search/filter
- **Table rows** show: avatar, name, email, role badge, premium status, storage usage
- **Row actions:** Edit, Suspend/Unsuspend, Delete (plus Approve/Deny for pending)
- Clicking a row drills into the existing user detail page (`/admin/users/[userId]`)

### User Detail Page

- Existing activity view (stats, listening, ratings) remains unchanged
- New actions added: Suspend/Unsuspend, Delete (alongside existing Edit)

### Suspend Flow

- Confirmation dialog: "Suspend [name]?" with an optional reason text field
- New `approvalStatus: "suspended"` value added to the schema
- Suspended user experience mirrors pending (locked out of all features) but with a distinct message: "Your account has been suspended. [reason if provided]. Contact an admin."
- Unsuspend action returns user to `approved` status
- Suspension reason stored on the user record and visible to the suspended user

### Delete Flow

- Confirmation dialog showing an activity summary with counts:
  - Ratings & reviews
  - Shelves & shelf books
  - Notes
  - Listening progress entries
  - Audio files (with total size in GB and book count)
  - Follows
  - Genre votes
  - User preferences
  - Warning about Clerk account destruction (user can never sign in again)
- **Checkbox** required before the "Delete permanently" button is enabled
- Cascade deletes all user data across 12+ tables, R2 audio files, and the Clerk account
- **Storage account handling on delete:**
  - If the user is the **sole user** on the storage account → delete the account record and all its R2 files
  - If **other users share** the storage account → only delete audio files where `uploadedBy` matches this user; leave the account and other users' files intact

## Storage Page (`/admin/storage`)

### Layout

- Table of all storage accounts showing: name, bytes used, file count, assigned users

### Empty Account Action

- Confirmation dialog with summary: "This will delete [N] audio files ([X] GB) across [Y] books for [Z] users. Proceed?"
- Emptying an account:
  - Deletes all R2 objects under the account's path prefix
  - Deletes all `audioFiles` records tied to that `storageAccountId`
  - Deletes all `listeningProgress` records for affected books/users
  - Resets `totalBytesUsed` and `fileCount` to 0
  - Users assigned to the account remain assigned (they just have no audio)

## Schema Changes

- `approvalStatus` on `users` table: add `"suspended"` as a valid value (currently `"pending"` | `"approved"`)
- New field on `users` table: `suspensionReason` (optional string) — stores admin-provided reason, visible to the suspended user
- Full-text search index on `users` table for server-side user search (if not already present)

## Open Questions

1. **Suspend reason storage:** Simple `suspensionReason` field on users table vs. a more general admin notes/history system. Leaning toward the simple field.
2. **Empty storage account — listeningProgress scope:** Should it delete listening progress for ALL users who had audio from that storage account, or just users assigned to that account? In practice these should be the same set given the access control model.
