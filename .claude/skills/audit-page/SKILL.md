---
name: audit-page
description: Deep audit of a page — read the page component and every component it imports, then report on the full visual structure, design patterns, and areas for improvement. Use at the start of a redesign to understand what you're working with.
argument-hint: <route-or-file-path>
allowed-tools: Read, Grep, Glob
---

# Page Audit

Perform a deep audit of the page at `$ARGUMENTS`.

## Steps

1. **Find the page file**: If a route is given (e.g., `/books`), map it to `app/books/page.tsx`. If a file path is given, use it directly.

2. **Read the page and ALL its imported components**: Follow every local import (from `@/components/`, `@/hooks/`, etc.) and read those files too. Build a complete picture of the page's component tree.

3. **Document the visual structure** as a tree:
   ```
   Page
   ├── StickyHeader
   │   ├── Heading
   │   ├── SearchInput
   │   ├── SortSelect
   │   └── AddButton (editor only)
   ├── MobileList (sm:hidden)
   │   └── BookListItem × N
   └── DesktopGrid (hidden sm:grid)
       └── BookCard × N
   ```

4. **Catalog every visual pattern used**:
   - Layout (grid columns, flex directions, spacing)
   - Colors (which CSS variables and hardcoded values)
   - Typography (font sizes, weights, colors)
   - Interactive states (hover, focus, active, disabled)
   - Loading/empty/error states
   - Animations and transitions
   - Responsive breakpoints and behavior changes

5. **Identify design inconsistencies or areas for improvement**:
   - Spacing irregularities
   - Inconsistent hover effects
   - Missing loading/empty states
   - Accessibility gaps (missing labels, contrast issues)
   - Hardcoded values that should use design tokens

## Output

A structured report with:
1. **Component tree** (visual hierarchy)
2. **Pattern inventory** (every visual pattern on the page)
3. **Improvement opportunities** (ranked by impact)
4. **Dependencies** (which shared components this page uses that other pages also use — changing these affects more than just this page)
