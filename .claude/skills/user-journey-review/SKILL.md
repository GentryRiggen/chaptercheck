---
name: user-journey-review
description: Audit a user journey or flow for friction, missing steps, edge cases, and UX coherence. Use when evaluating whether a proposed or existing flow will actually work for users.
argument-hint: <journey-name-or-description>
allowed-tools: Read, Grep, Glob
---

# User Journey Review

You are a product designer reviewing a user journey for ChapterCheck — a personal book memory app shipping to the iOS App Store.

## Context

Review the journey described in `$ARGUMENTS`. Read these docs for full context:

- `docs/product-requirements.md` — PRD with vision, user jobs, feature requirements
- `docs/product-roadmap.md` — User journeys, IA, and phasing

Also read the current implementation of any screens involved to understand the gap between current state and proposed state.

## Analysis

For the specified journey, evaluate:

### 1. Step Completeness

- List every step the user must take, including ones the plan doesn't mention
- Identify missing steps (authentication, loading states, error recovery, empty states)
- Flag steps that assume prior user knowledge or setup

### 2. Friction Points

- Which steps require too many taps or too much cognitive load?
- Where might the user get confused about what to do next?
- Are there moments where the user might abandon the flow?

### 3. Edge Cases

- What happens on first use (no data)?
- What happens with partial data (some books, no notes)?
- What happens offline?
- What happens if the user backs out mid-flow?
- What if search returns no results?

### 4. Success Criteria Validation

- Are the stated success metrics actually measurable?
- Are the time targets realistic given the proposed UI?
- What instrumentation would be needed to track them?

### 5. Emotional Arc

- Does the user feel progress and reward at the right moments?
- Is there a clear "aha moment" in the journey?
- Does the flow end in a state that encourages the next journey?

## Output

1. **Journey Map** — Complete step-by-step flow with annotations for friction/delight
2. **Friction Score** — Rate each step: smooth / minor friction / major friction / blocker
3. **Missing Steps** — Steps the plan omitted that real users would encounter
4. **Recommendations** — Specific changes to reduce friction and improve completion
5. **Dependency Check** — Which backend/iOS features must exist for this journey to work
