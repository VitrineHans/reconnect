---
phase: 02-core-loop
plan: "03"
subsystem: reveal
tags: [realtime, reveal, video-player, friendship-card, edge-function, push-notification]
dependency_graph:
  requires: [02-01-question-engine, 02-02-video-upload]
  provides: [useRevealSubscription, VideoPlayer, FriendshipCard, reveal-screen, notify-reveal-stub]
  affects: [home-screen, 02-04-design-system, 03-01-streak-engine, 03-02-push-notifications]
tech_stack:
  added: []
  patterns:
    - Realtime postgres_changes INSERT on question_responses; re-query DB to confirm count=2 (never trust payload alone)
    - All .on() calls registered BEFORE .subscribe() (prevents crash — RESEARCH Pitfall 3)
    - supabase.removeChannel(channel) on useEffect teardown (prevents memory leak — RESEARCH Pitfall 4)
    - expo-video useVideoPlayer + player.addListener('playToEnd', ...) for deletion trigger
    - createSignedUrl(path, 300) — 5-minute expiry; never stored in DB
    - storage.remove([path]) takes array; update watched_at in same onWatched handler
    - Guard double-deletion with hasWatchedRef (useRef boolean)
key_files:
  created:
    - mobile/hooks/useRevealSubscription.ts
    - mobile/components/VideoPlayer.tsx
    - mobile/components/FriendshipCard.tsx
    - mobile/app/friendship/[id]/reveal.tsx
    - mobile/app/friendship/[id]/_layout.tsx
    - mobile/__tests__/useRevealSubscription.test.ts
    - mobile/__tests__/FriendshipCard.test.tsx
    - supabase/functions/notify-reveal/index.ts
  modified:
    - mobile/app/(tabs)/home.tsx
decisions:
  - Signed URL expiry: 300 seconds (5 minutes) — enough for a 30s video with network variance; not stored in DB
  - hasWatchedRef guards double-deletion in VideoPlayer (playToEnd can fire twice on some devices)
  - Edge Function stub sends push via Expo Push API; Phase 3 DB trigger wires it to both-submitted event
  - TypeScript circular reference in test mock resolved with explicit MockChannel type annotation
  - FriendshipCard countdown updates every 60s via setInterval (not every second — battery friendly)
  - home.tsx waiting state is a no-op on press (no navigation); UX intentional
metrics:
  duration_minutes: 8
  completed_date: "2026-04-05"
  tasks_completed: 3
  files_created: 8
  files_modified: 1
---

# Phase 02 Plan 03: Reveal Mechanic Summary

**One-liner:** Realtime both-submitted detection with Supabase postgres_changes, expo-video playback with ephemeral deletion, and three-state FriendshipCard closing the core loop end-to-end.

## What Was Built

### useRevealSubscription (mobile/hooks/useRevealSubscription.ts)
Subscribes to `postgres_changes` INSERT events on `question_responses` filtered by `friendship_id`. On every INSERT, re-queries the DB to count responses for the specific `friendship_id + question_id` pair — if count is 2, sets `revealReady = true`. All `.on()` calls are registered before `.subscribe()`. Cleanup via `supabase.removeChannel(channel)` in the useEffect teardown prevents memory leaks. When `enabled=false`, no channel is created (allows conditional use on non-active friendships).

### VideoPlayer (mobile/components/VideoPlayer.tsx)
Wraps `expo-video`'s `useVideoPlayer` hook with a `playToEnd` listener. On the `playToEnd` event: calls `storage.remove([storagePath])` then updates `question_responses.watched_at`. Guards against double-deletion with a `hasWatchedRef` boolean. `deleteAndMarkWatched` is extracted as a standalone async function to keep the component under 30 lines.

### FriendshipCard (mobile/components/FriendshipCard.tsx)
Three state variants:
- `reveal_ready`: purple border + tinted background (`#6B4EFF`), CTA "Watch Now 👀"
- `your_turn`: standard card, countdown from `expiresAt` (updates every 60s), CTA "Record Answer"
- `waiting`: muted, CTA "Waiting for {friendName}..."

Always shows: friend name (display_name or username fallback), `🔥 {streakCount}` badge, question preview truncated to 80 chars. Full card is a `TouchableOpacity` with `testID` for testing.

### reveal.tsx (mobile/app/friendship/[id]/reveal.tsx)
Fetches the friendship's `current_question_id`, then queries `question_responses` for the partner's response (`neq user_id`). Generates a fresh signed URL (`createSignedUrl(path, 300)`) — never stored in DB. Renders `VideoPlayer`; `onWatched` navigates to `/(tabs)/home` via `router.replace`.

### Edge Function stub (supabase/functions/notify-reveal/index.ts)
Deno TypeScript stub. Accepts `POST { friendshipId, userId }`. Fetches friend's `push_token` from `profiles` using the service role key. Calls Expo Push API. Phase 3 DB trigger will invoke this function when both `question_responses` are inserted.

### home.tsx upgrade
Replaced inline View rendering with `<FriendshipCard>`. `handleCardPress` routes:
- `reveal_ready` → `/friendship/${id}/reveal`
- `your_turn` → `/friendship/${id}/question`
- `waiting` → no-op

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript circular inference in test mock**
- **Found during:** Task 1 — `npx tsc --noEmit` after Task 2
- **Issue:** `mockOn` and `mockChannel` mutually referenced each other, causing implicit `any` type errors in TS strict mode
- **Fix:** Declared explicit `MockChannel` type with `on: jest.Mock; subscribe: jest.Mock` before the mock objects, breaking the circular inference chain
- **Files modified:** `mobile/__tests__/useRevealSubscription.test.ts`
- **Commit:** eedafa8

## Task 3: Checkpoint Human-Verify

**Status:** Auto-approved (AUTO_CFG=true)

The full reveal mechanic is wired end-to-end in code. Manual verification (two simulator sessions completing the full loop, storage deletion, Realtime state transition) is deferred to a human-run session. All unit tests pass and TypeScript is clean.

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Edge Function body | `supabase/functions/notify-reveal/index.ts` | Phase 3 DB trigger not yet created; function body is complete but not wired to any trigger |
| question.tsx | `mobile/app/friendship/[id]/question.tsx` | Placeholder screen from pre-02-02; will be wired in a future plan |

## Threat Surface Scan

No new threat surface beyond the plan's threat model. All items from the threat register are addressed:
- T-02-03-01: RLS from 02-01 enforces the count=2 gate on `question_responses` SELECT
- T-02-03-02: Signed URL generated fresh at reveal time, 300s expiry, never persisted to DB
- T-02-03-03: Storage DELETE RLS (from 02-01 migration) verifies path segment matches `auth.uid()`
- T-02-03-05: `supabase.removeChannel(channel)` in useEffect cleanup

## Self-Check: PASSED

See verification below.
