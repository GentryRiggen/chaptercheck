---
name: audit-responsive
description: Audit a page or component for responsive design issues — missing breakpoints, touch target sizes, overflow problems, and mobile/desktop parity. Use before or during a redesign to catch responsive gaps.
argument-hint: <file-path-or-route>
allowed-tools: Read, Grep, Glob
---

# Responsive Design Audit

Audit `$ARGUMENTS` for responsive design quality.

## Checks to perform

1. **Read the target file(s)** — if a route like `/books` is given, find the corresponding page in `app/` and all components it imports

2. **Breakpoint coverage**: For every layout-affecting class, verify responsive variants exist:
   - Grid columns should scale (e.g., `sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`)
   - Padding/margins should adjust (`px-3 sm:px-6 lg:px-8`)
   - Font sizes should scale where appropriate
   - Flag any fixed widths that could cause horizontal overflow on mobile

3. **Mobile/Desktop parity**: Check for `hidden sm:flex` / `sm:hidden` patterns
   - Both mobile and desktop variants should show equivalent content
   - Flag content visible on desktop but completely missing on mobile (or vice versa)

4. **Touch targets**: Interactive elements should be at least 44x44px on mobile
   - Check button sizes, link padding, icon button dimensions
   - Flag any `h-6 w-6` or smaller interactive elements without adequate padding

5. **Overflow safety**: Look for potential horizontal overflow
   - Long text without `truncate`, `line-clamp-*`, or `overflow-hidden`
   - Fixed-width containers without `max-w-full`
   - Flex containers without `min-w-0` on text children

6. **Container consistency**: Verify the standard container pattern is used:
   ```
   mx-auto max-w-7xl px-3 py-4 sm:px-6 lg:px-8
   ```

## Output

Produce a checklist with pass/fail for each check, specific line numbers for issues, and suggested fixes.
