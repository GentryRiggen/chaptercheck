---
name: design-system
description: Display the current design system reference — colors, tokens, typography, spacing, component variants, and patterns used across the ChapterCheck codebase. Use this when you need quick access to the design system during redesign work.
allowed-tools: Read, Grep, Glob
---

# Design System Reference

Read the following files and produce a concise, organized reference of the current design system:

1. **`app/globals.css`** — CSS variables for light/dark mode (HSL values), custom keyframes, base styles
2. **`lib/theme.ts`** — Neon accent colors (cyan/pink), theme helpers
3. **`components/ui/button.tsx`** — Button variants (default, destructive, outline, secondary, ghost, link, delicious)
4. **`tailwind.config.ts`** or `tailwind.config.js` — Extended theme values, custom animations, plugins

Output a quick-reference organized by:

- **Colors**: Background, foreground, card, primary, secondary, muted, border, destructive, accent (cyan/pink) — both light and dark values
- **Typography**: Font stack, heading sizes (h1–h3), body text, muted text patterns
- **Spacing**: Container max-widths, page padding (mobile/tablet/desktop), common gap values
- **Border radius**: lg/md/sm values, common usage (cards use rounded-xl)
- **Shadows & effects**: Glassmorphism (backdrop-blur), hover transforms, card shadows
- **Animations**: Custom keyframes (slow-spin, float, ripple), transition durations
- **Component variants**: Button, Badge, Card styling patterns
- **Responsive breakpoints**: sm (640), md (768), lg (1024), xl (1280) and how they're used
