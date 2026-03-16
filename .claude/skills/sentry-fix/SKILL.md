---
name: sentry-fix
description: Fetch unresolved Sentry errors for ChapterCheck, write fixes, commit, push, and resolve the issues. Run periodically to keep error counts at zero.
---

# Sentry Error Fix

Fetch unresolved errors from Sentry, diagnose root causes in the codebase, implement fixes, push them, and resolve the issues in Sentry.

## Configuration

- **Sentry org:** `willful-divide`
- **Sentry projects:** `chaptercheck-ios` (iOS), `chaptercheck-web` (Web)
- **Auth token env var:** `SENTRY_PERSONAL_AUTH_TOKEN` in `.env.local` at repo root

## Steps

### 1. Load the auth token

```bash
TOKEN=$(grep '^SENTRY_PERSONAL_AUTH_TOKEN=' .env.local | cut -d'=' -f2-)
```

### 2. Fetch unresolved issues from both projects

For each project (`chaptercheck-ios`, `chaptercheck-web`), fetch unresolved issues sorted by frequency:

```
GET https://sentry.io/api/0/projects/willful-divide/{project}/issues/?query=is:unresolved&sort=freq&statsPeriod=90d
Header: Authorization: Bearer $TOKEN
```

Parse the JSON response. Each issue has: `id`, `shortId`, `title`, `culprit`, `level`, `count`, `firstSeen`, `lastSeen`, `status`, `metadata`.

If `$ARGUMENTS` is provided, filter issues to only those matching the argument (e.g., a shortId like `CHAPTERCHECK-IOS-4`, or a keyword to match against titles).

### 3. For each issue, fetch the latest event for diagnostic detail

```
GET https://sentry.io/api/0/issues/{issue_id}/events/latest/
Header: Authorization: Bearer $TOKEN
```

Extract from the response:

- **Exception info:** `entries` where `type == "exception"` → each value's `type`, `value` (the error message), and `stacktrace.frames` (focus on frames where `inApp == true`; use `module`, `function`, `filename`, `lineNo`)
- **Breadcrumbs:** `entries` where `type == "breadcrumbs"` → last 15 entries showing what the user was doing before the error
- **Tags:** `tags` array — look for `error_context`, `os`, `device`, `environment`
- **Context:** `contexts` — device info, app version, OS version

### 4. Diagnose and fix each issue

For each issue:

1. **Analyze the error:** Read the exception message, stacktrace, and breadcrumbs to understand what went wrong
2. **Find the relevant code:** Use the stacktrace filenames/functions to locate the code in the repo. For iOS issues, look in `apps/ios/ChapterCheck/`. For web issues, look in `apps/web/`.
3. **Read the surrounding code** to fully understand the context and data flow
4. **Implement the fix:**
   - For iOS (Swift): follow the patterns in CLAUDE.md — `@Observable`, `@MainActor`, actor isolation, Decodable optionals, `Double` for Convex numbers
   - For web (TypeScript): follow the patterns in CLAUDE.md — strict TypeScript, Tailwind, shadcn/ui, Convex hooks
   - Keep fixes minimal and targeted — fix the bug, don't refactor surrounding code
5. **If you cannot confidently fix an issue** (e.g., the stacktrace is entirely in system/third-party code with no in-app frames, or the root cause is ambiguous), skip it and explain why in your summary

### 5. Commit fixes

After all fixes are implemented:

1. Create a single commit (or one per logical fix if they're independent) with a descriptive message referencing the Sentry issue IDs
2. Push to the current branch

### 6. Resolve issues in Sentry

For each issue that was fixed, resolve it via the API:

```
PUT https://sentry.io/api/0/issues/{issue_id}/
Header: Authorization: Bearer $TOKEN
Content-Type: application/json
Body: {"status": "resolved"}
```

### 7. Summary

Output a summary table:

| Sentry ID          | Title             | Project | Action  | Details                                 |
| ------------------ | ----------------- | ------- | ------- | --------------------------------------- |
| CHAPTERCHECK-IOS-4 | EXC_BREAKPOINT... | iOS     | Fixed   | Made field optional in Decodable struct |
| CHAPTERCHECK-WEB-2 | TypeError...      | Web     | Fixed   | Added null check in ...                 |
| CHAPTERCHECK-IOS-7 | ...               | iOS     | Skipped | No in-app frames, third-party crash     |

## Important Notes

- **Don't resolve issues you didn't fix.** Only call the resolve API for issues where you actually pushed a code fix.
- **Reopens are fine.** This skill runs periodically — if a resolved issue recurs, Sentry will automatically reopen it and the next run will pick it up.
- **Prioritize by frequency and severity.** Fix `fatal`/`error` level issues before `warning`s. Fix high-count issues before low-count ones.
- **Check for duplicates.** Multiple Sentry issues can stem from the same root cause. If you fix the root cause, resolve all related issues.
