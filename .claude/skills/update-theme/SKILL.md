---
name: update-theme
description: Update theme colors, design tokens, or CSS variables across the entire codebase consistently. Use when changing the color palette, adjusting spacing tokens, or modifying the overall visual theme.
argument-hint: [description of theme changes]
---

# Update Theme

Apply theme changes described by: `$ARGUMENTS`

## Files to update (in order)

1. **`app/globals.css`** — CSS custom properties (HSL values for light and dark modes)
2. **`lib/theme.ts`** — Neon accent color definitions (if accent colors are changing)
3. **`components/layout/MeshBackground.tsx`** — Background gradient and orb colors (if background is changing)
4. **`components/ui/button.tsx`** — Button variant colors, especially the `delicious` gradient variant
5. **`components/ui/badge.tsx`** — Badge variant colors
6. **`components/ui/sonner.tsx`** — Toast notification theming

## Process

1. **Read all theme files** listed above to understand current values
2. **Present the proposed changes** as a before/after comparison — get user approval before modifying
3. **Apply changes** starting from the CSS variables (globals.css) since most components inherit from these
4. **Search for hardcoded colors**: Grep for any hex codes (#00e5ff, #ff0099, #db2777, #06b6d4, etc.) and CSS color values that bypass the theme system — these need manual updates
5. **Verify dark mode**: Ensure both `:root` (light) and `.dark` selectors are updated consistently
6. **Check logo files**: If accent colors changed, update `app/icon.svg`, `app/apple-icon.svg`, `public/logo.svg`, `public/logo-mark.svg`, and `components/Logo.tsx`

## Rules

- Always update both light AND dark mode values
- Maintain sufficient contrast ratios (WCAG AA minimum)
- Keep the HSL format for CSS variables (e.g., `240 10% 3.9%`)
- Test that destructive/error colors remain clearly distinguishable from primary colors
- Don't change spacing, typography, or layout — only colors and visual tokens
