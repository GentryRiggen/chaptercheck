---
name: ios-audit-screen
description: Deep audit of a SwiftUI screen — read the view, its ViewModel, subviews, and repositories, then report on visual structure, data flow, and areas for improvement. Use at the start of an iOS redesign.
argument-hint: <ViewName-or-file-path>
allowed-tools: Read, Grep, Glob
---

# iOS Screen Audit

Perform a deep audit of the SwiftUI screen at `$ARGUMENTS`.

## Steps

1. **Find the view file**: If a view name is given (e.g., `HomeView`), search for it in `apps/ios/ChapterCheck/`. If a file path is given, use it directly.

2. **Read the view and ALL its dependencies**:
   - The main View file
   - Its ViewModel (`*ViewModel.swift`)
   - All subviews referenced within the view
   - Any repositories it uses (`*Repository.swift`)
   - Navigation destinations it pushes to
   - Environment objects it depends on (AudioPlayerManager, DownloadManager, ThemeManager, etc.)

3. **Document the view hierarchy** as a tree:

   ```
   HomeView
   ├── NavigationStack
   │   ├── ScrollView
   │   │   ├── ContinueListeningSection
   │   │   │   └── BookRow × N
   │   │   ├── TopRatedSection
   │   │   │   └── BookCard × N
   │   │   └── ShelvesSection
   │   │       └── ShelfRow × N
   │   └── .toolbar
   │       └── SettingsButton
   └── MiniPlayerSpacer (80pt)
   ```

4. **Catalog the implementation patterns**:
   - **Layout**: ScrollView vs List, LazyVStack vs VStack, geometry readers
   - **State management**: @State, @Binding, @Observable ViewModel, @Environment
   - **Data flow**: Which Convex subscriptions, how data loads, refresh patterns
   - **Navigation**: NavigationLink, .navigationDestination, sheet/fullScreenCover
   - **Styling**: Colors (ThemeManager tokens vs hardcoded), fonts, spacing
   - **Loading/empty/error states**: What exists, what's missing
   - **Animations**: Transitions, withAnimation, matchedGeometryEffect
   - **Accessibility**: Labels, traits, dynamic type support
   - **Offline behavior**: What happens without network

5. **Identify improvement opportunities**:
   - Missing states (loading, empty, error, offline)
   - Accessibility gaps
   - Performance concerns (unnecessary redraws, missing lazy loading)
   - Inconsistencies with other screens
   - Hardcoded values that should use shared tokens
   - Navigation flow issues

## Output

A structured report with:

1. **View hierarchy** (visual tree)
2. **Data flow diagram** (ViewModel → Repository → ConvexService)
3. **Pattern inventory** (every implementation pattern on this screen)
4. **State coverage** (loading/empty/error/offline — what exists vs what's missing)
5. **Improvement opportunities** (ranked by impact)
6. **Dependencies** (which shared components/services this screen uses — blast radius of changes)
