---
name: ios-redesign-screen
description: Redesign a SwiftUI screen with a new visual style or layout while preserving functionality, data flow, and accessibility. Use when changing the look or structure of an iOS screen.
argument-hint: <ViewName-or-file-path> [design-direction]
---

# iOS Screen Redesign

You are redesigning a SwiftUI screen while preserving its functionality and data integrity.

## Steps

1. **Read the target view**: `$ARGUMENTS` — understand its view body, ViewModel bindings, navigation, and environment dependencies

2. **Read the ViewModel**: Understand all published state, Convex subscriptions, mutations, and computed properties

3. **Read all subviews**: Follow every extracted view and subview to understand the full component tree

4. **Read the theme system**: Check `apps/ios/ChapterCheck/Theme/` for ThemeManager, AccentColorToken, and current styling patterns

5. **Audit current screen**: Run through the ios-audit-screen analysis mentally — understand what exists before proposing changes

6. **Identify functional contracts that MUST be preserved**:
   - All navigation destinations (NavigationLink, .navigationDestination, sheet, fullScreenCover)
   - All user interactions (buttons, swipe actions, context menus, long press)
   - All data bindings (@Binding, @Environment, ViewModel connections)
   - All accessibility attributes (accessibilityLabel, accessibilityHint, accessibilityTraits)
   - Mini player bottom padding (80pt spacer for ZStack overlay in MainTabView)
   - Offline behavior

7. **Propose the redesign**: Present the new visual approach to the user before implementing, explaining:
   - What changes visually
   - What stays the same functionally
   - Which files will be modified
   - Whether new subviews should be extracted

8. **Implement**: Apply the redesign following these rules

## Rules

- **NEVER break existing functionality** — all tap handlers, navigation, data flow, and mutations must work identically
- **NEVER remove accessibility attributes** — preserve all labels, hints, and traits
- **Preserve the ViewModel API** — the view should consume the same ViewModel properties
- **Use ThemeManager tokens** — access colors via ThemeManager/AccentColorToken, not hardcoded Color values
- **Keep @Observable pattern** — ViewModels use @Observable + @MainActor, not ObservableObject
- **Maintain mini player spacing** — 80pt bottom spacer in all scrollable content
- **Support dynamic type** — use system font styles (.title, .headline, .body, .caption) not fixed sizes
- **iOS 26 patterns** — use modern SwiftUI APIs (NavigationStack, .sensoryFeedback, etc.)
- **Preserve offline behavior** — screens must degrade gracefully without network
- **Extract subviews** — if the view body exceeds ~100 lines, extract sections into separate View structs in the same file or a subviews folder
