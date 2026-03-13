# ChapterCheck Implementation Tracker

## Purpose

This is the working document for multi-day execution.

Use it to track:

- current phase
- in-progress decisions
- completed decisions
- next recommended task
- blockers
- handoff context for future sessions

This should stay shorter and more operational than the PRD or roadmap.

## Active Plan

Current phase:
Backend schema and data-layer migration

Current goal:
Implement the first backend-compatible version of the new data model:

- richer reading statuses
- broader book memory types
- per-user reusable tags
- audiobook support as an optional advanced layer

## Current Documents

- Product requirements: [product-requirements.md](/Users/griggen/dev/code/personal/chaptercheck/docs/product-requirements.md)
- Product roadmap: [product-roadmap.md](/Users/griggen/dev/code/personal/chaptercheck/docs/product-roadmap.md)
- Schema proposal: [schema-proposal.md](/Users/griggen/dev/code/personal/chaptercheck/docs/schema-proposal.md)

## Current Decisions

### Confirmed

- Product positioning is `personal book memory app with audiobook support`
- Audiobook playback/downloads stay
- Audiobook file management is not the main App Store story
- The next major implementation foundation is schema redesign
- Reading status model will be:
  `want_to_read`, `reading`, `finished`, `paused`, `dnf`
- `reread` is tracked separately, not as a primary status
- `startedAt` and `finishedAt` are both important and user-editable
- `personalSummary` belongs on `bookUserData`
- Tags will replace categories as the main note-organization model
- Tags will be per-user, reusable, quick-create, and zero-to-many per note
- Existing categories should migrate into tags

### Pending

- Final migration strategy
- Whether quotes and notes share a single table or split into separate tables
- Whether note categories should be fully removed or temporarily retained during migration
- Final format tracking scope for V1

## Next Recommended Work

1. Update iOS models and repositories for new backend fields
2. Replace category-based note UI with tag-based UI
3. Replace binary read-state UI with status-based UI
4. Add client support for `personalSummary` and `currentFormat`
5. Add search support for memory entries

## Open Questions

- Do we want format tracking in V1: physical, ebook, audiobook, mixed?
- Should note categories be removed immediately after migration, or tolerated temporarily for compatibility?
- Do we want a dedicated note title in V1, or can note text plus tags carry most of the value?

## Blockers

No backend blockers.
Client migration work is still pending.

## Session Notes

### March 9, 2026

- Created PRD in [product-requirements.md](/Users/griggen/dev/code/personal/chaptercheck/docs/product-requirements.md)
- Created execution roadmap in [product-roadmap.md](/Users/griggen/dev/code/personal/chaptercheck/docs/product-roadmap.md)
- Began schema review of current `bookUserData` and `bookNotes` model
- Created working tracker in [implementation-tracker.md](/Users/griggen/dev/code/personal/chaptercheck/docs/implementation-tracker.md)
- Created schema proposal in [schema-proposal.md](/Users/griggen/dev/code/personal/chaptercheck/docs/schema-proposal.md)
- Locked status model, summary placement, and tag direction
- Implemented first-pass backend schema changes for statuses, summaries, formats, tags, and note compatibility
- Added `memoryTags` and `bookNoteTags`
- Added backend compatibility so legacy category-based note clients can continue working temporarily

## How To Use This Doc

At the end of each working session, update:

- `Current phase`
- `Current decisions`
- `Next recommended work`
- `Open questions`
- `Session notes`

This should become the easiest place to resume after time away.
