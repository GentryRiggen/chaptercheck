# Noir Editorial Redesign

Full visual redesign of ChapterCheck from neon cyan/pink to a bold, high-contrast editorial style: black backgrounds, white text, electric red (#dc2626) as the sole accent.

## Design Decisions

- **Light/Dark mode**: Keep both. Dark = pure black + white + red. Light = off-white + black + red (like a broadsheet newspaper). Zero extra effort since CSS variables already separate modes.
- **MeshBackground**: Replace 228-line animated mesh with ~30-line static component (solid background + optional subtle grid texture). Same component signature, no layout.tsx changes needed.
- **BookCover gradients**: Replace colorful gradients (violet, emerald, etc.) with neutral-toned monochrome variants. Two variants get a subtle red-950 tint for variety.
- **Border radius**: Global `--radius` drops from 0.5rem to 0.125rem, eliminating rounded corners across all shadcn/ui components automatically.

## Blast Radius: ~35 files modified, 5 deleted

---

## Phase 1: Theme Foundation (do first — cascades everywhere)

### 1.1 `app/globals.css` — CSS variables
Replace all HSL values. Key changes:

Dark mode (`.dark`):
```
--background: 0 0% 0%;           /* pure black */
--foreground: 0 0% 98%;          /* near-white */
--card: 0 0% 3%;                 /* slightly off-black */
--card-foreground: 0 0% 98%;
--popover: 0 0% 5%;
--popover-foreground: 0 0% 98%;
--primary: 0 72% 51%;            /* red-600 #dc2626 */
--primary-foreground: 0 0% 100%;
--secondary: 0 0% 10%;           /* neutral-900 */
--secondary-foreground: 0 0% 85%;
--muted: 0 0% 12%;
--muted-foreground: 0 0% 55%;    /* neutral-500 */
--accent: 0 0% 12%;
--accent-foreground: 0 0% 98%;
--destructive: 0 72% 51%;
--destructive-foreground: 0 0% 100%;
--border: 0 0% 18%;              /* neutral-800 */
--input: 0 0% 18%;
--ring: 0 72% 51%;               /* red focus rings */
--radius: 0.125rem;              /* kills rounded corners globally */
```

Light mode (`:root`):
```
--background: 0 0% 98%;          /* off-white */
--foreground: 0 0% 5%;
--card: 0 0% 100%;
--card-foreground: 0 0% 5%;
--popover: 0 0% 100%;
--popover-foreground: 0 0% 5%;
--primary: 0 72% 51%;            /* same red-600 */
--primary-foreground: 0 0% 100%;
--secondary: 0 0% 93%;           /* neutral-200 */
--secondary-foreground: 0 0% 15%;
--muted: 0 0% 93%;
--muted-foreground: 0 0% 40%;
--accent: 0 0% 93%;
--accent-foreground: 0 0% 5%;
--destructive: 0 72% 51%;
--destructive-foreground: 0 0% 100%;
--border: 0 0% 82%;              /* neutral-300 */
--input: 0 0% 82%;
--ring: 0 72% 51%;
--radius: 0.125rem;
```

### 1.2 `lib/theme.ts` — Replace neon palette
- `neonColors` → `editorialColors` (red, white, neutral)
- `meshBackground` → `editorialBackground` (simple bg color + grid config)
- Update exports/types. Only MeshBackground.tsx imports this.

### 1.3 `tailwind.config.ts` — Remove unused animations
- Remove `slow-spin`, `slow-spin-reverse`, `float`, `ripple` keyframes (MeshBackground no longer needs them)

---

## Phase 2: Background & Layout Chrome (parallel, after Phase 1)

### 2.1 `components/layout/MeshBackground.tsx`
Replace entire component (~228 lines → ~30 lines). Fixed div with background color + optional CSS grid texture pattern. Remove all mouse tracking, orbs, ripples, corner glows.

### 2.2 `components/layout/Navigation.tsx`
- Container: `bg-background/90 backdrop-blur-sm` (black/90 in dark)
- Nav links: Add `uppercase tracking-wider text-xs font-medium`
- Active state: `border-b-2 border-primary` (red underline) instead of `bg-secondary`
- Logo text: `uppercase tracking-wider`

### 2.3 `components/Logo.tsx` + 4 SVG assets
- Bookmark stroke: `currentColor` (adapts to theme) in .tsx, `#ffffff` in static SVGs
- Checkmark stroke: `#dc2626` (red-600) everywhere
- Files: `app/icon.svg`, `app/apple-icon.svg`, `public/logo.svg`, `public/logo-mark.svg`

---

## Phase 3: UI Primitives (parallel with Phase 2, after Phase 1)

All 10 shadcn/ui components. Most get editorial styling automatically from CSS variables; manual fixes for shadows and the delicious variant:

| File | Changes |
|------|---------|
| `button.tsx` | `delicious` variant → solid red with `uppercase tracking-wider`. Remove `shadow` from default. |
| `card.tsx` | Remove `shadow`. Explicit `rounded-sm`. |
| `badge.tsx` | Add `uppercase tracking-wider text-[10px]` to base. |
| `input.tsx` | Remove `shadow-sm`. |
| `select.tsx` | Remove `shadow-sm` from trigger, `shadow-md` from content. |
| `dialog.tsx` | Remove `shadow-lg` from content. Overlay already `bg-black/80`. |
| `tabs.tsx` | Remove `shadow` from active trigger. |
| `sheet.tsx` | Remove `shadow-lg`. |
| `progress.tsx` | Track: `bg-neutral-800` explicitly. Fill inherits red from primary. |
| `slider.tsx` | Track: `bg-neutral-800`. Thumb: `border-neutral-600`. |

---

## Phase 4: Feature Components (after Phases 2+3)

### Cards (BookCard, AuthorCard, LibraryBookCard)
Replace: `rounded-xl bg-card/50 shadow-sm ring-1 ring-border/50 hover:-translate-y-1 hover:shadow-lg hover:ring-primary/30`
With: `rounded-sm border border-neutral-800 bg-card hover:border-red-600/50 transition-all`

### BookCover.tsx
Replace 8 colorful gradient variants with neutral-toned variants (`from-neutral-700/20 to-neutral-900/20`). Two with subtle `red-950/10` tint. Change `rounded-lg` → `rounded-sm`.

### StarRating.tsx
`fill-amber-500 text-amber-500` → `fill-red-500 text-red-500`

### BookGenres.tsx
Genre tags already use `hover:border-primary/50` which resolves to red. Add `uppercase tracking-wider` if not on Badge base.

### AuthorImage.tsx
Replace colorful gradient fallbacks with neutral-toned. Adjust ring colors.

### ReviewCard.tsx
Remove `shadow-sm backdrop-blur-sm`. Own review: `border-red-600/30 bg-red-950/10`.

### Audio (NowPlayingBar, NowPlayingExpanded)
- Remove shadows from covers
- Progress track: explicit `bg-neutral-800`
- All `bg-primary` fills now red automatically

### SignInCard.tsx
Inherits editorial styling from Card. Logo colors updated in Phase 2.

---

## Phase 5: Pages (after Phase 4)

### `app/page.tsx` (Landing + Dashboard)
- Hero heading: Add `uppercase tracking-tight font-black`
- Section headings: Add `uppercase tracking-wider`

### `app/books/page.tsx` + `app/authors/page.tsx`
- Sticky header: `bg-background/90 backdrop-blur-sm`
- Page heading: `uppercase tracking-wider`
- Mobile list: `rounded-sm bg-card` (remove /60 opacity)
- Optional: pixel-gap grid (`gap-px bg-neutral-800` on container)

### Detail pages (`books/[bookId]`, `authors/[authorId]`, `series/[seriesId]`)
- Remove `shadow-lg` from covers
- `rounded-lg` → `rounded-sm` on cards/covers
- Links already resolve to red via `text-primary`

### `app/account/page.tsx`, `app/users/[userId]/page.tsx`
- Inherit Card styling from Phase 3. Minimal page-level changes.

### Auth pages
- `rounded-xl` in skeleton → `rounded-sm`

---

## Phase 6: Cleanup

1. Delete concept pages: `app/1/`, `app/2/`, `app/3/`, `app/4/`, `app/5/`
2. Clean `tailwind.config.ts` (remove unused keyframes)
3. Verification grep for: `#00e5ff`, `#ff0099`, `neonColors`, `amber-500` in rating context, stray `shadow-lg`

---

## Execution Order

```
Phase 1 (sequential, must be first):
  1.1 globals.css
  1.2 lib/theme.ts
  1.3 tailwind.config.ts

Phase 2 + 3 (parallel with each other, after Phase 1):
  2.1 MeshBackground.tsx    3.1 button.tsx
  2.2 Navigation.tsx        3.2 card.tsx
  2.3 Logo + SVGs           3.3 badge.tsx
                            3.4-3.10 remaining ui/

Phase 4 (after 2+3):
  BookCard, AuthorCard, LibraryBookCard, BookCover,
  StarRating, BookGenres, AuthorImage, ReviewCard,
  NowPlayingBar, NowPlayingExpanded, SignInCard

Phase 5 (after 4):
  All pages

Phase 6 (final):
  Delete concepts, clean config, verify
```

---

## Verification

1. `npm run type-check` — ensure lib/theme.ts export renames don't break
2. `npm run lint` — catch any issues
3. `npm run format:check` — formatting
4. Visual QA: Start dev server, check dark mode, light mode, mobile viewport
5. Key pages to check: `/` (landing + dashboard), `/books`, `/books/[any-book]`, `/authors`, `/sign-in`
6. Check audio player bar, expanded player, dialogs, forms

## Accessibility Notes

- Red-600 (#dc2626) on black (#000000): ~5.3:1 contrast ratio (passes WCAG AA)
- White on black: ~21:1 (passes AAA)
- Neutral-500 muted text on black: ~5.3:1 (passes AA)
- Neutral-400 on black: ~7.4:1 (passes AAA)

## Design Reference

See `app/2/page.tsx` for the full Noir Editorial design concept page with mock data showing all patterns (hero, book grid, player, reviews ticker, color palette).
