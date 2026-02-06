---
name: redesign-component
description: Redesign a specific component or page with a new visual style while preserving all functionality and accessibility. Use when the user wants to change the look of a component.
argument-hint: <component-path> [style-direction]
---

# Redesign Component

You are redesigning a component while preserving its functionality.

## Steps

1. **Read the target component**: `$ARGUMENTS` — understand its props, state, event handlers, and data flow
2. **Find all usages**: Search for imports and usages across the codebase to understand how it's consumed and what props are passed
3. **Read the design system**: Check `app/globals.css` and `lib/theme.ts` for current design tokens
4. **Identify functional elements**: List every interactive element, accessible attribute (aria-*, role), keyboard handler, and data binding — these MUST be preserved
5. **Propose the redesign**: Present the new visual approach to the user before implementing, explaining what changes and what stays the same
6. **Implement**: Apply the new styles using only Tailwind CSS classes and the existing design tokens. Use `cn()` from `lib/utils` for conditional classes.

## Rules

- NEVER break existing functionality — all click handlers, form submissions, navigation, and data bindings must work identically
- NEVER remove accessibility attributes (aria-label, role, tabIndex, etc.)
- Keep the same component API (props interface) — callers should not need to change
- Use existing shadcn/ui primitives from `components/ui/` when possible
- Stick to Tailwind classes — no inline styles, no new CSS files
- Maintain responsive behavior (check for sm:, md:, lg: breakpoints)
- Preserve dark mode support — use CSS variables (bg-background, text-foreground, etc.) not hardcoded colors
- If the component has mobile/desktop variants (hidden sm:flex, etc.), redesign BOTH
