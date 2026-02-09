# Mobile Migration Tracker

## Phase 1: npm → Yarn 4 + Turborepo

- [x] Enable Corepack, initialize Yarn 4
- [x] Create `.yarnrc.yml` (nodeLinker: node-modules)
- [x] Delete `package-lock.json`, generate `yarn.lock`
- [x] Update `.gitignore` for Yarn
- [x] Install Turborepo, create `turbo.json`
- [x] Add root workspace scripts
- [x] Update CI workflow (npm → yarn)
- [x] Verify: `yarn dev`, `yarn build`, `yarn lint`, `yarn type-check`

## Phase 2: Workspace packages + move web app

- [x] 2a: Create `packages/convex-backend/` (move `convex/`, add `convex.json`)
- [x] 2a: Verify `npx convex codegen` works
- [x] 2b: Create `packages/shared/` (validations, utils, hooks, types)
- [x] 2c: Create `packages/tailwind-config/` (theme, cn(), colors)
- [x] 2d: Move web app into `apps/web/` (all files, package.json, tsconfig)
- [x] 2e: Update all imports in `apps/web/`
- [x] Verify: `yarn turbo build`, `yarn turbo lint`, `yarn turbo type-check`
- [x] Verify: `npx convex dev` works
- [x] Verify: E2E tests pass
- [ ] Merge to main

## Phase 3: Scaffold Expo mobile app

- [x] 3a: Create `apps/mobile/` with Expo + package.json
- [x] 3b: Configure Metro for monorepo
- [x] 3c: Configure NativeWind + tailwind
- [x] 3d: Set up Clerk + Convex auth providers
- [x] 3e: Set up Expo Router navigation (tabs + stack)
- [x] Verify: App builds for iOS simulator, TypeScript passes, Metro bundles successfully

## Phase 4a: Core UI components

- [x] Button, Card, Input, Badge, Separator, Label
- [x] Dialog (Modal), Sheet (BottomSheet)
- [x] Select, Switch, Tabs, Checkbox
- [x] Form components (react-hook-form integration)

## Phase 4b: Browse screens

- [x] Adapt usePaginatedList for FlatList
- [x] BookCard component
- [x] Books browse screen (search, sort, genre filter, infinite scroll)
- [x] AuthorCard component
- [x] Authors browse screen
- [x] RoleGate component
- [x] Pull-to-refresh

## Phase 4c: Detail screens

- [x] Book detail (metadata, series, authors, genres, ratings)
- [x] Book reviews list + review dialog
- [x] Author detail (bio, series, books)
- [x] Series detail (ordered books)
- [x] Shelf detail (books, reorder, share)
- [x] User profile (stats, shelves, library)

## Phase 4d: CRUD operations — SKIPPED

> CRUD for books/authors/series is web-only. Mobile is for browsing, audio playback, and shelves.

## Phase 4e: Audio player

- [x] react-native-track-player setup + playback service
- [x] Mobile AudioPlayerContext
- [x] Background playback + lock screen controls
- [x] Mini player bar
- [x] Expanded player (modal)

## Phase 4f: Polish

- [x] Dark/light mode
- [x] Read status tracking + review writing
- [x] Error boundaries + loading skeletons
- [x] Haptic feedback

## Phase 5: CI/CD

- [ ] Change detection job (dorny/paths-filter)
- [ ] Update web jobs (npm → yarn, turbo)
- [ ] Add mobile deploy job (EAS)
- [ ] Update lefthook
- [ ] Verify: conditional deploys work

## Phase 6: Testing

- [ ] Update Playwright config for monorepo
- [ ] Update vitest for apps/web
- [ ] Add vitest for packages/shared
- [ ] Mobile unit tests (Jest)
- [ ] Mobile E2E (Maestro)
