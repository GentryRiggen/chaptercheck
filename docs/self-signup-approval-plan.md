# Self Sign-Up with Manual Admin Approval

## Context

Currently, all ChapterCheck users are created manually by the admin via the admin dashboard. There's no way for someone to create their own account. This plan adds self-service sign-up on both web and iOS, with a "pending" approval state that lets the admin manually vet and approve each new user before they get full access.

## Design Decisions

- **Pending users get browse-only access**: Can view the library and write reviews/ratings. Blocked from: shelves, following, audio playback.
- **Locked features appear grayed out** with a tooltip: "Available after account approval"
- **Sign-up collects**: first name, last name, email (OTP verified), optional profile photo (Clerk profile image)
- **Sign-in page unchanged**: keeps anti-enumeration behavior, adds "Don't have an account? Create one" link
- **Admin approval via dashboard**: new "Pending Users" section, admin picks role + premium per user when approving
- **Denial silently removes** the user (Clerk account + Convex record deleted)
- **No emails for now**: admin checks dashboard manually, users see real-time state change via Convex subscriptions
- **Existing users unaffected**: `undefined` approvalStatus treated as approved, no migration
- **Real-time unlock**: when admin approves, Convex subscription pushes new permissions instantly
- **Both web and iOS** get the sign-up flow and pending state handling

---

## 1. Schema: Add `approvalStatus` to users table

**File:** `packages/convex-backend/convex/schema.ts`

Add field to users table:

```typescript
approvalStatus: v.optional(
  v.union(v.literal("pending"), v.literal("approved"))
),
```

Add index for admin queries:

```typescript
.index("by_approvalStatus", ["approvalStatus"])
```

Convention: `undefined` (existing users) = approved. No migration needed.

---

## 2. Backend: Auth helpers for approval gating

**File:** `packages/convex-backend/convex/lib/auth.ts`

Add:

- `isApproved(user)` — returns `true` if `approvalStatus` is `undefined` or `"approved"`
- `requireApproved(ctx)` — calls `requireAuth(ctx)`, throws if not approved
- `requireApprovedMutation(ctx)` — calls `requireAuthMutation(ctx)`, throws if not approved

Follow the existing pattern of `requirePremium`/`requirePremiumMutation`.

---

## 3. Backend: Update permissions query

**File:** `packages/convex-backend/convex/users/queries.ts`

Update `UserPermissions` interface — add:

- `isPending: boolean`
- `isApproved: boolean`
- `canManageShelves: boolean` (requires approved)
- `canFollow: boolean` (requires approved)

Update `getCurrentUserWithPermissions`:

- Compute `approved` from `isApproved(user)`
- `canPlayAudio` and `canUploadAudio` now also require `approved`
- Return `approvalStatus` in the user payload

Add `listPendingUsers` query (admin-only):

- Query with `by_approvalStatus` index for `"pending"`
- Return same shape as `listAllUsers` items

Update `listAllUsers` and `getAdminUserDetail` to include `approvalStatus`.

---

## 4. Backend: Approval mutations

**File:** `packages/convex-backend/convex/users/mutations.ts`

Add `approveUser` mutation:

- Args: `userId`, `role`, `hasPremium`, optional `storageAccountId`
- Requires admin. Validates user is pending.
- Patches: `approvalStatus: "approved"`, `role`, `hasPremium`, `storageAccountId`

Add `denyUser` mutation:

- Args: `userId`
- Requires admin. Deletes the Convex user record.
- Clerk account deletion handled separately via API route.

**New file:** `apps/web/app/api/admin/users/[userId]/route.ts`

DELETE handler:

- Verify caller is admin (same pattern as existing `apps/web/app/api/admin/users/route.ts`)
- Look up Convex user to get `clerkId`
- Call `clerk.users.deleteUser(clerkId)` — Clerk webhook then fires `user.deleted`

---

## 5. Webhook: Set pending status for self-registered users

**File:** `packages/convex-backend/convex/auth/clerkWebhook.ts`

In `handleClerkWebhook` (httpAction), pass `publicMetadata` from `evt.data` to the `createUser` mutation:

```typescript
const { id, email_addresses, first_name, last_name, image_url, public_metadata } = evt.data;
await ctx.runMutation(internal.auth.clerkWebhook.createUser, {
  ...existingArgs,
  adminCreated: public_metadata?.adminCreated === true,
});
```

In `createUser` internal mutation:

- Add `adminCreated: v.optional(v.boolean())` arg
- New users: `approvalStatus: args.adminCreated ? "approved" : "pending"`
- Existing users (idempotent path): don't change `approvalStatus`

**File:** `apps/web/app/api/admin/users/route.ts`

In the POST handler where admin creates Clerk users, add metadata:

```typescript
publicMetadata: {
  adminCreated: true;
}
```

**File:** `packages/convex-backend/convex/lib/auth.ts`

In `requireAuthMutation` fallback user creation (line 111-120), set `approvalStatus: "pending"`.

---

## 6. Backend: Gate shelves, follows, audio for pending users

Add `requireApprovedMutation` check at the top of mutation handlers in:

- `packages/convex-backend/convex/shelves/mutations.ts` — all mutations
- `packages/convex-backend/convex/follows/mutations.ts` — follow/unfollow
- `packages/convex-backend/convex/listeningProgress/mutations.ts` — saving progress
- Audio file presigned URL actions — prevent pending users from getting stream URLs

Leave unchanged: book browsing queries, review/rating mutations, search queries.

---

## 7. Web: Sign-up page

**File:** `apps/web/app/(auth)/sign-up/[[...sign-up]]/page.tsx` — replace redirect with real page

**New file:** `apps/web/components/auth/SignUpCard.tsx`

Three-step flow modeled after `SignInCard`:

1. **"info" step**: First name (required), last name (required), email (required) — React Hook Form + Zod
2. **"otp" step**: Reuse existing `OtpVerificationForm` component
3. **"photo" step** (optional): Profile photo upload via Clerk's `user.setProfileImage({ file })`

Uses `useSignUp()` from `@clerk/nextjs`:

- `signUp.create({ firstName, lastName, emailAddress })` then `signUp.prepareEmailAddressVerification({ strategy: "email_code" })`
- OTP verify: `signUp.attemptEmailAddressVerification({ code })`
- On completion: `setActive({ session })` then redirect to `/`

Anti-enumeration: catch errors from `signUp.create()` for existing emails and show a generic message.

**New file:** `packages/shared/src/validations/auth.ts` — `signUpSchema` with firstName, lastName, email

**File:** `apps/web/components/auth/SignInForm.tsx` — add "Don't have an account? Create one" link to `/sign-up`

---

## 8. Web: Pending state UX

**File:** `apps/web/contexts/PermissionsContext.tsx`

Add to context interface and value:

- `isPending: boolean`
- `isApproved: boolean`

**New file:** `apps/web/components/permissions/ApprovalGate.tsx`

Wrapper component that disables children and shows tooltip for pending users.

**Pending banner**: Subtle banner in app layout when `isPending` — "Your account is pending approval. Some features are limited."

**Files to add gating** (use `can("canManageShelves")` etc.):

- Shelf-related components (AddToShelfPopover, create shelf buttons)
- Follow buttons
- Audio player context (prevent playback initiation)

Pattern: features appear grayed out with `Tooltip` saying "Available after account approval".

---

## 9. Admin: Pending users approval UI

**File:** `apps/web/app/admin/page.tsx`

Add "Pending Users" section above existing user table:

- Query `api.users.queries.listPendingUsers`
- Show count badge, avatar, name, email, registration date
- Approve / Deny buttons per row

**New file:** `apps/web/components/admin/ApproveUserDialog.tsx`

Modeled after `EditUserDialog`:

- Role selector (default: viewer), premium toggle (default: false), storage account selector (optional)
- Calls `api.users.mutations.approveUser`

**New file:** `apps/web/components/admin/DenyUserDialog.tsx`

Confirmation dialog → calls `DELETE /api/admin/users/[userId]` → toast on success

---

## 10. iOS: Sign-up flow

**File:** `apps/ios/ChapterCheck/Auth/AuthGateView.swift` — add state to show SignUpView vs SignInView

**File:** `apps/ios/ChapterCheck/Auth/SignInView.swift` — add "Don't have an account? Create one" button

**New file:** `apps/ios/ChapterCheck/Auth/SignUpView.swift`

Three-step flow matching web:

1. Collect firstName, lastName, email
2. Clerk sign-up + email code verification
3. Optional photo (Clerk `setProfileImage`)

---

## 11. iOS: Pending state handling

**File:** `apps/ios/ChapterCheck/Models/User.swift`

Add to `UserPermissions` struct: `isPending`, `isApproved`, `canManageShelves`, `canFollow`

The `CurrentUserProvider` (`@Observable`) publishes `currentUser: UserWithPermissions?` via Convex subscription — new fields flow automatically.

**iOS views to gate:**

- Audio playback (BookDetailView play button, AudioPlayerManager)
- Shelf views (ShelfListView, AddToShelfView)
- Follow button on profile views
- Add pending banner to MainTabView

All views reactively update via `@Observable` when admin approves.

---

## Implementation Order

1. Schema + `npx convex codegen`
2. Auth helpers (`isApproved`, `requireApproved`)
3. Webhook update (pending status for self-registrations)
4. Queries update (permissions with pending fields)
5. Mutations: approval actions + gating on shelves/follows/audio
6. **Web** (parallel with iOS):
   - Sign-up page + SignUpCard
   - Pending state UX (PermissionsContext, ApprovalGate, banner)
   - Admin approval UI (pending section, approve/deny dialogs)
7. **iOS** (parallel with web):
   - SignUpView
   - Pending state handling in views

## Verification

1. **Sign up on web**: Enter name + email → verify OTP → optionally set photo → land on home as pending
2. **Pending state web**: Browse library (works), try shelf/follow/audio (disabled with tooltip), see banner
3. **Admin approve**: See pending user → approve with role/premium → user's session updates in real-time
4. **Admin deny**: Deny user → Clerk account + Convex record deleted
5. **Existing users**: Still work normally with no `approvalStatus` set
6. **Admin-created users**: Created via dashboard → immediately approved (not pending)
7. **iOS**: Same sign-up flow → pending state → approval unlocks features
8. **Tests**: `npm run test:run`, `npm run lint`, `npm run type-check`
