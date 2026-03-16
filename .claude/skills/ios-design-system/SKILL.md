---
name: ios-design-system
description: Display the current iOS design system reference — ThemeManager, accent colors, typography, spacing, component patterns, and conventions used across the ChapterCheck iOS app. Use during iOS redesign work.
allowed-tools: Read, Grep, Glob
---

# iOS Design System Reference

Read the following files and produce a concise, organized reference of the current iOS design system:

1. **`apps/ios/ChapterCheck/Theme/ThemeManager.swift`** — Theme management, color scheme handling
2. **`apps/ios/ChapterCheck/Theme/AccentColorToken.swift`** — Accent color tokens and definitions
3. **Any other files in `apps/ios/ChapterCheck/Theme/`** — Additional theme files
4. **`apps/ios/ChapterCheck/App/ChapterCheckApp.swift`** — How theme is injected into the environment
5. **Sample views** — Scan 3-4 feature views (HomeView, LibraryView, BookDetailView, SettingsView) to identify common styling patterns

Output a quick-reference organized by:

- **Colors**: How accent colors work (AccentColorToken), background/foreground patterns, semantic colors used across views
- **Typography**: Font styles used (.largeTitle, .title, .headline, .body, .caption, .footnote), weight patterns, when custom fonts are used
- **Spacing**: Common padding values, section spacing, list row insets, ScrollView content padding
- **Navigation**: NavigationStack patterns, toolbar items, navigation titles (inline vs large)
- **Layout Patterns**: ScrollView + LazyVStack vs List, section headers, card patterns, grid layouts
- **Interactive Patterns**: Button styles, swipe actions, context menus, long-press gestures, haptic feedback (.sensoryFeedback)
- **State Patterns**: Loading (ProgressView, skeleton), empty states, error states, offline states
- **Mini Player**: 80pt bottom spacer pattern, how views account for the ZStack overlay
- **Animations**: Common transition patterns, withAnimation usage, matchedGeometryEffect
- **Accessibility**: VoiceOver patterns, dynamic type support, accessibility modifiers used
- **Dark/Light Mode**: How the app handles appearance switching
