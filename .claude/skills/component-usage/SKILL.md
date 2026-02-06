---
name: component-usage
description: Find every usage of a component across the codebase — imports, prop patterns, and rendering contexts. Use to understand blast radius before modifying or redesigning a component.
argument-hint: <ComponentName>
allowed-tools: Read, Grep, Glob
---

# Component Usage Analysis

Find all usages of `$ARGUMENTS` in the codebase.

## Steps

1. **Find the component definition**: Search for `export function $ARGUMENTS` or `export const $ARGUMENTS` to locate the source file
2. **Read the component**: Understand its props interface, variants, and default values
3. **Find all imports**: Search for `import.*$ARGUMENTS` across all .tsx/.ts files
4. **Find all render sites**: In each importing file, find where `<$ARGUMENTS` appears and note:
   - Which props are passed
   - What context it's rendered in (page, dialog, card, list item, etc.)
   - Whether it's conditionally rendered
   - Whether it's inside a responsive wrapper (hidden on mobile, etc.)

## Output

Produce a summary table:

| File | Context | Props Used | Conditional? | Notes |
|------|---------|-----------|-------------|-------|

Then list:
- **Total usage count**
- **Unique prop combinations** — which variants/props are actually used in practice
- **Unused props** — props defined but never passed by any consumer
- **Blast radius** — how many files would need testing if this component changes
