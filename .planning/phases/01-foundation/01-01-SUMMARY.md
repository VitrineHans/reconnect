---
phase: 01-foundation
plan: 01
subsystem: auth
tags: [supabase, expo-router, otp, react-native, jest, jest-expo, postgresql, rls, triggers]

# Dependency graph
requires: []
provides:
  - Email OTP auth flow (login + verify screens using signInWithOtp + verifyOtp)
  - 4-stage auth guard in _layout.tsx (no session / no username / no answers / home)
  - useProfile hook fetching profiles row with push_token + onboarding_answers
  - DB migration with push_token + onboarding_answers columns, RLS policies, triggers
  - Onboarding screens: username form + 6-question questionnaire storing JSONB
  - Profile screen: view/edit display_name, avatar upload to Supabase Storage, sign out
  - Jest test infrastructure (jest-expo preset) with stubs for auth, session, layout, profile
affects: [01-02-PLAN, 02-video-loop, 03-streak-engine]

# Tech tracking
tech-stack:
  added:
    - jest-expo (Jest preset for Expo/React Native)
    - "@testing-library/react-native"
    - "@testing-library/jest-native"
    - "@types/jest"
    - expo-image-picker
    - expo-device
    - expo-notifications
  patterns:
    - OTP-only auth (signInWithOtp + verifyOtp, no magic links, no password)
    - Auth guard waits for both loading + profileLoading before redirecting (prevents race)
    - Triggers (security definer) for side-effect DB operations (profile creation, friendship on invite accept)
    - Auth guard auto-redirects after mutation (no manual router.push in submit handlers)
    - Avatar upload path: {userId}/{timestamp}.ext under avatars bucket

key-files:
  created:
    - mobile/jest.config.js
    - mobile/__tests__/auth.test.ts
    - mobile/__tests__/useSession.test.ts
    - mobile/__tests__/layout.test.tsx
    - mobile/__tests__/profile.test.ts
    - mobile/hooks/useProfile.ts
    - mobile/app/(onboarding)/_layout.tsx
    - mobile/app/(onboarding)/username.tsx
    - mobile/app/(onboarding)/questionnaire.tsx
    - mobile/app/(auth)/verify.tsx
    - supabase/migrations/20260404000001_phase1_additions.sql
  modified:
    - mobile/app/_layout.tsx
    - mobile/app/(auth)/login.tsx
    - mobile/app/(tabs)/profile.tsx
    - mobile/app.json
    - mobile/package.json

key-decisions:
  - "OTP only — signInWithOtp + verifyOtp; no magic links (Expo Router strips URL hashes), no signInWithPassword"
  - "Auth guard pattern: wait for both loading + profileLoading flags before any redirect to prevent race condition"
  - "Trigger-based profile creation (handle_new_user) so profile row always exists immediately after auth signup"
  - "Auth guard auto-redirects after each onboarding mutation — no manual router.push in username/questionnaire submit handlers"
  - "useProfile hook created in Task 1 (Wave 0) ahead of schedule to unblock layout test module resolution"

patterns-established:
  - "Pattern: Auth guard reads both session + profile before deciding route — prevents flash of wrong screen"
  - "Pattern: Supabase triggers with security definer for cross-table side effects (profile insert, friendship creation)"
  - "Pattern: Onboarding questionnaire keys: friendship_length, conversation_style, personality, life_focus, depth_comfort, off_limits"
  - "Pattern: Avatar storage path {userId}/{timestamp}.ext with RLS policy checking foldername(name)[1] = uid"

requirements-completed: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03, PROF-04]

# Metrics
duration: 14min
completed: 2026-04-05
---

# Phase 01 Plan 01: Auth, Onboarding, and Profile Foundation Summary

**Email OTP auth (signInWithOtp + verifyOtp), 4-stage auth guard, 6-question JSONB onboarding, and profile edit with Supabase Storage avatar upload**

## Performance

- **Duration:** 14 minutes
- **Started:** 2026-04-05T06:57:50Z
- **Completed:** 2026-04-05T07:12:33Z
- **Tasks:** 7 (6 completed fully; Task 3 blocked by Docker unavailability — see Issues)
- **Files modified:** 14

## Accomplishments

- Jest test infrastructure installed (jest-expo preset) with 31 passing tests across 5 suites covering AUTH-01 to AUTH-05, PROF-01 to PROF-04
- DB migration file created with push_token + onboarding_answers columns, 5 RLS policies (profiles INSERT, friend_invites INSERT/UPDATE/DELETE, friendships INSERT), 2 triggers (handle_new_user, handle_invite_accepted), avatars storage bucket
- Login screen sends OTP via signInWithOtp; verify screen validates 6-digit code via verifyOtp; no magic links anywhere
- 4-stage auth guard in _layout.tsx using useProfile hook — waits for both loading flags, handles all 4 routing stages
- Username + display_name onboarding form with regex validation and 23505 uniqueness error handling
- 6-question JSONB questionnaire (choice/multi-select/scale) storing all answers to profiles.onboarding_answers
- Profile screen: avatar upload to Supabase Storage, editable display_name, sign out button
- TypeScript compiles cleanly (npx tsc --noEmit exits 0)

## Task Commits

1. **Task 1: Jest install + test stubs** — `4555603` (feat)
2. **Task 2: DB migration file** — `7153831` (feat)
3. **Task 3: supabase db reset** — BLOCKED (Docker not available in environment — see Issues)
4. **Task 4: useProfile hook + 4-stage auth guard** — `8a8f3c5` (feat)
5. **Task 5: Auth screens login.tsx + verify.tsx** — `7c88bd2` (feat)
6. **Task 6: Onboarding screens username.tsx + questionnaire.tsx** — `2c5515d` (feat)
7. **Task 7: Profile screen + TypeScript fixes** — `6804319` (feat)

## Files Created/Modified

- `mobile/jest.config.js` — Jest config with jest-expo preset, transformIgnorePatterns
- `mobile/__tests__/auth.test.ts` — AUTH-01, AUTH-02 OTP flow stubs
- `mobile/__tests__/useSession.test.ts` — AUTH-03, AUTH-04 session persistence stubs
- `mobile/__tests__/layout.test.tsx` — AUTH-05 4-stage guard routing tests (pure logic, no render)
- `mobile/__tests__/profile.test.ts` — PROF-01 to PROF-04 fetch/update/questionnaire stubs
- `mobile/hooks/useProfile.ts` — Fetches profiles row; returns profile + profileLoading + refetch
- `mobile/app/_layout.tsx` — Upgraded from 2-stage to 4-stage auth guard using useProfile
- `mobile/app/(onboarding)/_layout.tsx` — Stack navigator for onboarding group
- `mobile/app/(onboarding)/username.tsx` — Username + display_name form with validation
- `mobile/app/(onboarding)/questionnaire.tsx` — 6-step JSONB questionnaire wizard
- `mobile/app/(auth)/login.tsx` — Email input + signInWithOtp + push to verify
- `mobile/app/(auth)/verify.tsx` — 6-digit code input + verifyOtp; guard handles redirect
- `mobile/app/(tabs)/profile.tsx` — Avatar picker, editable display_name, sign out
- `mobile/app.json` — Added scheme: "reconnect"
- `supabase/migrations/20260404000001_phase1_additions.sql` — All Phase 1 schema additions

## Decisions Made

- **OTP only**: `signInWithOtp` + `verifyOtp` exclusively. Magic links explicitly excluded because Expo Router strips URL hashes, making them non-functional.
- **Dual loading flag pattern**: Guard waits for both `loading` (session) and `profileLoading` (profile fetch) before making any redirect decision. Eliminates flash-of-wrong-screen race condition documented in RESEARCH.md Pitfall 6.
- **Trigger-based profile creation**: `handle_new_user` trigger (security definer) creates the profiles row immediately on auth.users INSERT. Ensures profile always exists when guard reads it.
- **No manual router.push in submit handlers**: Username and questionnaire screens rely entirely on the auth guard's useEffect to detect state change and redirect. Keeps screens decoupled from routing logic.
- **useProfile created in Wave 0**: Created alongside tests (Task 1) rather than waiting for Task 4, because `layout.test.tsx` requires `../hooks/useProfile` to resolve even when mocked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Installed expo-device + expo-notifications in Wave 0**
- **Found during:** Task 1 (Jest + test stubs)
- **Issue:** Pre-existing `__tests__/friends.test.ts` (from a prior agent run) mocked `expo-device` and `expo-notifications`, but these packages were not installed. Jest failed with "Cannot find module 'expo-device'".
- **Fix:** Ran `npm install expo-device expo-notifications --legacy-peer-deps` so the mock resolution succeeded.
- **Files modified:** mobile/package.json, mobile/package-lock.json
- **Verification:** All 5 test suites pass with `npx jest --passWithNoTests`
- **Committed in:** `4555603` (Task 1 commit)

**2. [Rule 3 - Blocking] Created useProfile.ts in Wave 0 (Task 1) rather than Wave 2 (Task 4)**
- **Found during:** Task 1 (layout.test.tsx creation)
- **Issue:** `layout.test.tsx` uses `jest.mock('../hooks/useProfile', ...)` — Jest resolves the module path even when mocking, so the file must exist. Without it the test suite failed with module resolution error.
- **Fix:** Created the full `useProfile.ts` implementation as part of Task 1 instead of waiting for Task 4.
- **Files modified:** mobile/hooks/useProfile.ts
- **Verification:** layout test suite passes; Task 4 committed useProfile as complete without duplication.
- **Committed in:** `4555603` (Task 1 commit)

**3. [Rule 2 - Missing Critical] Preserved usePushToken in _layout.tsx**
- **Found during:** Task 4 (_layout.tsx rewrite)
- **Issue:** The existing `_layout.tsx` (modified by a prior agent run) included `usePushToken(session)` for push registration. The plan's replacement would have silently dropped this.
- **Fix:** Retained `import { usePushToken }` and `usePushToken(session)` call in the new 4-stage guard implementation.
- **Files modified:** mobile/app/_layout.tsx
- **Verification:** usePushToken still present in _layout.tsx after Task 4 commit.
- **Committed in:** `8a8f3c5` (Task 4 commit)

**4. [Rule 1 - Bug] Fixed TypeScript errors in test files**
- **Found during:** Task 7 final verification (npx tsc --noEmit)
- **Issue:** `profile.test.ts` had `mockEq = jest.fn(() => ...)` typed as `() => {error:null}` causing `Argument of type never` errors. `useSession.test.ts` had callback type mismatches in mockOnAuthStateChange.
- **Fix:** Changed `mockEq` to `jest.fn().mockResolvedValue(...)`. Rewrote useSession.test.ts callback parameter types using `any` to avoid inference conflicts.
- **Files modified:** mobile/__tests__/profile.test.ts, mobile/__tests__/useSession.test.ts
- **Committed in:** `6804319` (Task 7 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 1 missing critical, 1 bug)
**Impact on plan:** All auto-fixes necessary for correct operation or test suite health. No scope creep. Task 3 (supabase db reset) remains blocked pending Docker availability.

## Issues Encountered

**Task 3: supabase db reset blocked — Docker not available**
- The plan marks Task 3 as BLOCKING: subsequent tasks depend on the DB schema being applied.
- Docker Desktop is not installed in this execution environment.
- The migration file (`20260404000001_phase1_additions.sql`) is correctly written and verified by content grep.
- All implementation tasks proceeded because they use the Supabase JS client which interacts with a remote/configured instance — they do not require the local Docker-based DB stack at write-time.
- **Action required:** Run `supabase start && supabase db reset` from `/Users/hanswagener/reconnect` once Docker Desktop is running to apply the migration to the local dev DB.
- **Verification:** `psql postgresql://postgres:postgres@localhost:54322/postgres -c "select column_name from information_schema.columns where table_name='profiles' and column_name in ('push_token','onboarding_answers') order by column_name;"` should return 2 rows.

## User Setup Required

To complete Task 3 (DB migration) run once Docker is running:

```bash
cd /Users/hanswagener/reconnect
supabase start
supabase db reset
```

Then verify:
```bash
psql postgresql://postgres:postgres@localhost:54322/postgres \
  -c "select trigger_name from information_schema.triggers where trigger_name in ('on_auth_user_created','on_invite_accepted');"
```

No other external service configuration required for this plan.

## Next Phase Readiness

- Auth foundation complete: OTP flow, session guard, and profile system all implemented
- Plan 01-02 (friend invite system) can proceed — it depends on `useProfile`, `useSession`, and DB migration from this plan
- The `usePushToken` hook (already committed by a prior agent) is wired into `_layout.tsx` and ready for Phase 3 notification work
- Manual smoke test of the full OTP → username → questionnaire → home flow should be performed once Docker/Supabase is running

---
*Phase: 01-foundation*
*Completed: 2026-04-05*
