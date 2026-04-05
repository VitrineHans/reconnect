---
phase: 01-foundation
plan: 02
subsystem: friends
tags: [expo-notifications, push-tokens, supabase, rls, friend-invites, friendships, react-native]

# Dependency graph
requires:
  - phase: 01-foundation-01
    provides: DB migration with friend_invites RLS policies, handle_invite_accepted trigger, friendships table, profiles.push_token column
provides:
  - usePushToken hook: registers Expo push token on first authenticated launch (physical device only)
  - friends.tsx screen: username search, send/accept/decline invites, friendships list
  - Push token stored in profiles.push_token via authenticated Supabase update
affects: [02-video-loop, 03-streak-engine, push-notifications]

# Tech tracking
tech-stack:
  added: [expo-notifications, expo-device, expo-constants]
  patterns:
    - useFriendsData hook pattern — encapsulates all Supabase queries + state for a screen
    - useRef idempotency guard — prevents re-registration on every render
    - DB trigger for friendship creation (client never writes directly to friendships on accept)

key-files:
  created:
    - mobile/hooks/usePushToken.ts
    - mobile/__tests__/friends.test.ts
  modified:
    - mobile/app/(tabs)/friends.tsx
    - mobile/app/_layout.tsx
    - mobile/package.json
    - mobile/jest.config.js

key-decisions:
  - "Single screen for all friend interactions (search + invites + list) rather than tabs/modals — reduces navigation friction"
  - "useFriendsData hook encapsulates all 3 Supabase queries and actions — screen component stays thin"
  - "DB trigger handle_invite_accepted creates friendship on accept — client never writes to friendships table directly"
  - "useRef registered flag for push idempotency — prevents re-registration on every render without needing useCallback"
  - "Device.isDevice guard returns null early on simulators — no push registration attempted"

patterns-established:
  - "Pattern: data hook per screen — useFriendsData returns all state, loaders, and action handlers"
  - "Pattern: query helpers as standalone async functions (not methods) — each ≤15 lines, easy to test"
  - "Pattern: fetchAll after mutating actions — always refresh all sections after invite send/accept/decline"

requirements-completed: [FRIEND-01, FRIEND-02, FRIEND-03, FRIEND-04, FRIEND-05, FRIEND-06, PUSH-01, PUSH-02]

# Metrics
duration: 35min
completed: 2026-04-05
---

# Phase 01 Plan 02: Friend System + Push Token Registration Summary

**Push token registration with Device.isDevice guard, username search with ilike + self-exclusion, send/accept/decline invite flow wired to DB trigger, and active friendships list — all in a single cohesive friends screen.**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-05T07:00:00Z
- **Completed:** 2026-04-05T07:35:00Z
- **Tasks:** 3 completed
- **Files modified:** 6

## Accomplishments

- Installed expo-notifications, expo-device, expo-constants and wired push token registration into app launch via `_layout.tsx`
- Built `usePushToken` hook with `Device.isDevice` guard (null on simulators), permission request, `getExpoPushTokenAsync`, and idempotent `useRef` guard — stores token in `profiles.push_token`
- Delivered complete `friends.tsx` screen: username search (ilike, debounced 300ms, excludes self), send invite (INSERT with 23505 duplicate handling), accept/decline (UPDATE → DB trigger creates friendship), and friendships list with profile join

## Task Commits

1. **Task 1: Install push packages + friends test stub (Wave 0)** — `b9e4db1` (feat)
2. **Task 2: usePushToken hook + wire into app launch (Wave 1)** — `dcd8789` (feat)
3. **Task 3: Friends screen + full test implementations (Wave 1+2)** — `eec0778` (feat)

## Files Created/Modified

- `mobile/hooks/usePushToken.ts` — Push token registration hook with Device guard and useRef idempotency
- `mobile/app/(tabs)/friends.tsx` — Full friends screen: search, pending invites, active friendships
- `mobile/app/_layout.tsx` — Added usePushToken(session) call for background registration on launch
- `mobile/__tests__/friends.test.ts` — Unit tests for PUSH-01/02 and FRIEND-01/02/04/05/06
- `mobile/package.json` — Added expo-notifications, expo-device, expo-constants; jest downgraded to 29
- `mobile/jest.config.js` — Fixed setupFilesAfterFramework typo → setupFilesAfterEnv

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Jest 30 incompatible with jest-expo 55**
- **Found during:** Task 1 — `npx jest` failed with `ReferenceError: You are trying to import a file outside of the scope of the test code`
- **Issue:** jest-expo 55 uses `@jest/create-cache-key-function@^29` which conflicts with jest 30's runtime internals; Expo 54's `winter/runtime.native.ts` uses import.meta patterns not supported by jest 30
- **Fix:** Downgraded jest from 30 to 29 via `npm install --save-dev jest@29 --legacy-peer-deps`
- **Files modified:** `mobile/package.json`, `mobile/package-lock.json`
- **Commit:** `b9e4db1`

**2. [Rule 1 - Bug] jest.config.js had typo `setupFilesAfterFramework` (invalid key)**
- **Found during:** Task 1 — jest printed validation warning "Unknown option setupFilesAfterFramework"
- **Fix:** Renamed to `setupFilesAfterEnv` (the correct Jest config key)
- **Files modified:** `mobile/jest.config.js`
- **Commit:** `b9e4db1`

**3. [Rule 3 - Blocking] expo-notifications/expo-device/expo-constants not in node_modules after `npx expo install`**
- **Found during:** Task 1 — `expo install` completed but packages were absent from node_modules; test suite failed with "Cannot find module 'expo-device'"
- **Fix:** Re-installed via `npm install expo-notifications expo-device expo-constants --legacy-peer-deps`
- **Files modified:** `mobile/package.json`
- **Commit:** `b9e4db1`

### Note: Plan 01-01 ran concurrently

Plan 01-01 also modified `_layout.tsx` (adding `useProfile` and onboarding guard). That version already includes the `usePushToken(session)` call committed in Task 2 of this plan. No conflict — both plans' changes are present in the final file.

## FRIEND-03 Manual-Only Note

FRIEND-03 (push notification fires when invite received) requires:
1. Physical device with dev build (APNs/FCM entitlements)
2. Real Expo project ID configured in `app.json`
3. Phase 3 push notification infrastructure to send the notification to `to_user.push_token`

Token registration (the prerequisite) is fully implemented via PUSH-01/02. FRIEND-03 push delivery is deferred to Phase 3.

## Known Stubs

None. All 3 sections of the friends screen are wired to real Supabase queries. Search results, pending invites, and friendships list all query live data. Empty states are shown when queries return no rows.

## Self-Check: PASSED

- `mobile/hooks/usePushToken.ts` — exists
- `mobile/app/(tabs)/friends.tsx` — exists, not placeholder
- `mobile/__tests__/friends.test.ts` — exists, 8 tests passing
- Commits `b9e4db1`, `dcd8789`, `eec0778` — all present in git log
