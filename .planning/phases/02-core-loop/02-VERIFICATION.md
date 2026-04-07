---
phase: 02-core-loop
verified: 2026-04-06T15:43:32Z
status: gaps_found
score: 4/6 must-haves verified
gaps:
  - truth: "Both users can record a 30s video answer and submit"
    status: failed
    reason: "home.tsx routes 'your_turn' state to /friendship/[id]/question, which is a hardcoded placeholder screen ('Question screen — coming in 02-02'). The actual VideoRecorder and record.tsx exist and are wired, but they are unreachable from the home screen navigation flow."
    artifacts:
      - path: "mobile/app/friendship/[id]/question.tsx"
        issue: "Placeholder screen — renders static text only, no VideoRecorder, no navigation to record.tsx"
    missing:
      - "question.tsx must render the current question text and provide a 'Record Answer' CTA that navigates to /friendship/[id]/record?questionId=... passing the questionId param"

  - truth: "Video is compressed before upload (VIDEO-04)"
    status: failed
    reason: "compressVideo() in useVideoUpload.ts is a stub that returns the input URI unchanged. react-native-compressor was installed but not called — the comment says it 'requires a custom dev build'."
    artifacts:
      - path: "mobile/hooks/useVideoUpload.ts"
        issue: "compressVideo() function body is 'return uri' — no compression applied"
    missing:
      - "Either call VideoCompressor.compress() from react-native-compressor, or document that VIDEO-04 is explicitly deferred to when a custom dev client is built (and remove the [x] from REQUIREMENTS.md)"

deferred:
  - truth: "When both submit, a push notification fires and the reveal card appears (REVEAL-02 / Success Criterion 4 partial)"
    addressed_in: "Phase 3"
    evidence: "Phase 3 goal: 'The 24h mechanic and push notifications make the app genuinely addictive.' Phase 3 success criteria include 'Push notifications fire for: friend invite received, reveal ready, streak risk at 4h'. The notify-reveal Edge Function stub is documented as Phase 3 wiring in 02-03-SUMMARY.md."
---

# Phase 2: Core Loop Verification Report

**Phase Goal:** Two friends can answer a question via video and experience the reveal.
**Verified:** 2026-04-06T15:43:32Z
**Status:** gaps_found
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A question is surfaced to both friends in an active friendship | VERIFIED | `useFriendships` queries `friendships.current_question_id` joined to `questions.text`; `rotate_daily_questions()` pg_cron runs at midnight UTC; 55 seed questions present |
| 2 | Both users can record a 30s video answer and submit | FAILED | `question.tsx` is a placeholder — the `your_turn` navigation path from home screen is broken; `record.tsx` and `VideoRecorder` exist and are wired but unreachable via normal navigation |
| 3 | Neither can see the other's video until both have submitted | VERIFIED | Migration `20260404000002_phase2_loop.sql` sets `question_responses` SELECT RLS with `count(*) = 2` gate; `reveal.tsx` queries partner response via `.neq('user_id', userId)` (RLS enforces the gate server-side) |
| 4 | When both submit, the reveal card appears on the home screen | VERIFIED | `useFriendships` sets `state = 'reveal_ready'` when `responses.length === 2`; `FriendshipCard` renders gold "Watch Now" CTA; `home.tsx` routes to `/friendship/[id]/reveal` |
| 5 | After watching, the video is deleted from storage | VERIFIED | `VideoPlayer` calls `supabase.storage.from('videos').remove([storagePath])` on `playToEnd` event; guarded by `hasWatchedRef` to prevent double-deletion |
| 6 | Home screen lists friendship cards sorted by state priority | VERIFIED | `useFriendships` sorts by `STATE_PRIORITY` (reveal_ready=0, your_turn=1, waiting=2); `FriendshipCard` renders all three states with distinct visual treatment |

**Score:** 4/6 truths verified

---

### Gaps Detail

#### Gap 1: question.tsx is a placeholder — your_turn navigation is broken

`mobile/app/friendship/[id]/question.tsx` still contains:

```
Question screen — coming in 02-02
```

`home.tsx` line 19 routes to this screen when a friendship is in `your_turn` state:

```typescript
router.push(`/friendship/${friendship.id}/question`);
```

`record.tsx` exists and is fully wired (accepts `id` and `questionId` params, calls `useVideoUpload`, inserts `question_responses`), but it is never navigated to from anywhere in the production app. The `question.tsx` screen was supposed to be a "show question + navigate to record" bridge, but it was never implemented. This breaks the core loop for any user who has not yet answered — the largest user population.

**Fix:** Implement `question.tsx` to:
1. Use `useQuestion(friendshipId)` to fetch and display the current question text
2. Render a CTA button that navigates to `/friendship/${id}/record?questionId=${question.id}`

#### Gap 2: Video compression is stubbed out (VIDEO-04)

`useVideoUpload.ts` lines 12-17:

```typescript
// Compression requires a custom dev build (react-native-compressor uses native code).
// In Expo Go we upload the raw video directly — compression will be re-enabled
// when the app is built with a custom dev client.
async function compressVideo(uri: string): Promise<string> {
  return uri;
}
```

`react-native-compressor` is installed and in `app.json` plugins, but `VideoCompressor.compress()` is never called. REQUIREMENTS.md marks VIDEO-04 as `[x]` complete, which is incorrect.

**Fix:** Either implement the compression call (it will work in a custom dev build), or downgrade VIDEO-04 to `[ ]` in REQUIREMENTS.md and document that compression is conditional on the custom dev client build.

---

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Push notification fires when both friends submit (REVEAL-02) | Phase 3 | Phase 3 success criteria: "Push notifications fire for: friend invite received, reveal ready, streak risk at 4h". The `notify-reveal` Edge Function stub is implemented and functional; 02-03-SUMMARY.md explicitly states "Phase 3 DB trigger will invoke this function when both question_responses are inserted." |

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `supabase/migrations/20260404000002_phase2_loop.sql` | Schema additions, RLS, pg_cron | VERIFIED | 157 lines; adds `current_question_id`, `expires_at`, videos bucket, corrected REVEAL-01 RLS, `rotate_daily_questions()` |
| `supabase/seeds/questions.sql` | 54+ seed questions | VERIFIED | 55 INSERT statements; funny/deep/personal categories |
| `mobile/hooks/useQuestion.ts` | Fetch current question for a friendship | VERIFIED | Queries `friendships.current_question_id` join, exposes `rateQuestion` |
| `mobile/hooks/useFriendships.ts` | All friendships with state computation | VERIFIED | Queries friendships + responses + profiles; sorts by priority |
| `mobile/hooks/useRevealSubscription.ts` | Realtime both-submitted detection | ORPHANED | Hook is substantive and tested; never used in any screen — `reveal.tsx` fetches data on mount instead |
| `mobile/hooks/useVideoUpload.ts` | Compress, upload with progress | PARTIAL | Upload pipeline works; `compressVideo()` is a stub returning the input URI unchanged |
| `mobile/components/VideoRecorder.tsx` | CameraView 30s recorder with state machine | VERIFIED | Full idle/recording/preview state machine; 30s timer; permission UI |
| `mobile/components/VideoPlayer.tsx` | expo-video playback + delete on playToEnd | VERIFIED | Uses `useVideoPlayer`; `playToEnd` triggers storage delete + `watched_at` update |
| `mobile/components/FriendshipCard.tsx` | Three-state card with all data displayed | VERIFIED | All three states; streak badge; countdown; animated pulse on reveal_ready |
| `mobile/app/(tabs)/home.tsx` | Wired FlatList with priority-sorted cards | VERIFIED | `useFriendships` → `FriendshipCard`; correct routing per state |
| `mobile/app/friendship/[id]/record.tsx` | Record screen wired to upload pipeline | VERIFIED (but unreachable) | Wired to `useVideoUpload`; inserts `question_responses`; navigates home on success — but only reachable if `question.tsx` is fixed |
| `mobile/app/friendship/[id]/reveal.tsx` | Reveal screen with friend's video | VERIFIED | Fetches partner response, generates signed URL (300s), renders `VideoPlayer` |
| `mobile/app/friendship/[id]/question.tsx` | Question display + navigate to record | STUB | Placeholder text "Question screen — coming in 02-02"; no real implementation |
| `mobile/theme/tokens.ts` | Design token system | VERIFIED | 172 lines; colors, typography, spacing, radius, shadows all defined; imported by all components |
| `supabase/functions/notify-reveal/index.ts` | Push notification Edge Function | STUB (intentional) | Function body is complete and functional; not wired to a DB trigger — documented as Phase 3 work |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `home.tsx` | `useFriendships` | import + hook call | WIRED | Line 4-6: imports; line 13: `useFriendships(userId)` |
| `home.tsx` | `FriendshipCard` | import + render | WIRED | Line 6: import; rendered in FlatList renderItem |
| `home.tsx` | `reveal.tsx` | router.push | WIRED | Line 16-17: `router.push('/friendship/${id}/reveal')` for reveal_ready |
| `home.tsx` | `question.tsx` | router.push | BROKEN | Line 19: routes to question screen which is a placeholder |
| `question.tsx` | `record.tsx` | (missing) | NOT_WIRED | question.tsx has no navigation logic at all |
| `record.tsx` | `useVideoUpload` | import + call | WIRED | Line 6: import; line 15: `useVideoUpload()`; line 25: `upload(...)` |
| `record.tsx` | `VideoRecorder` | import + render | WIRED | Line 4: import; line 69-72: renders `<VideoRecorder>` |
| `reveal.tsx` | `VideoPlayer` | import + render | WIRED | Line 5: import; line 101-106: renders `<VideoPlayer>` with all 4 required props |
| `VideoPlayer` | `supabase.storage.remove` | direct call on playToEnd | WIRED | Line 14: `deleteAndMarkWatched`; line 29-35: called on `playToEnd` event |
| `useRevealSubscription` | any screen | (not imported) | ORPHANED | Only appears in its own test file — not used in any screen |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `home.tsx` | `friendships` | `useFriendships(userId)` → Supabase join query | Yes — real DB query with joins to questions and question_responses | FLOWING |
| `FriendshipCard` | `friendship` prop | Passed from `useFriendships` | Yes — computed from real DB rows | FLOWING |
| `reveal.tsx` | `signedUrl` | `fetchRevealData` → `supabase.storage.createSignedUrl` | Yes — real signed URL generated at runtime | FLOWING |
| `record.tsx` | `progress`, `uploading` | `useVideoUpload()` XHR onprogress | Yes — real XHR progress events (compression is stubbed but upload itself is real) | FLOWING (with compression caveat) |

---

### Behavioral Spot-Checks

Step 7b: SKIPPED — no runnable entry points without a connected simulator and Supabase instance. All checks require React Native runtime.

---

### Requirements Coverage

| Requirement | Description | Status | Evidence |
|-------------|-------------|--------|----------|
| LOOP-01 | Each friendship has one active question at a time | SATISFIED | `friendships.current_question_id` column + `rotate_daily_questions()` assigns one per friendship |
| LOOP-02 | New question surfaced every 24 hours | SATISFIED | pg_cron schedule `'0 0 * * *'` calls `rotate_daily_questions()` |
| LOOP-03 | Category selected by weighted algorithm | PARTIAL | Rotation picks `order by random()` — no weighting by category yet. Migration has no weighted selection logic. |
| LOOP-04 | Users can like/dislike a question | SATISFIED | `useQuestion.rateQuestion()` upserts to `question_ratings`; RLS policies in migration |
| LOOP-05 | Questions not repeated within a friendship | SATISFIED | `rotate_daily_questions()` excludes `question_id in (select question_id from question_responses where friendship_id = f.id)` |
| VIDEO-01 | User can record a short video (max 30s) | SATISFIED (unreachable) | `VideoRecorder` with `maxDuration: 30`; unreachable via normal navigation due to question.tsx stub |
| VIDEO-02 | User can re-record before submitting | SATISFIED (unreachable) | `handleReRecord()` in VideoRecorder resets to idle state |
| VIDEO-03 | Video uploaded to Supabase Storage with signed URL | SATISFIED (unreachable) | `useVideoUpload` uses `createSignedUploadUrl` + XHR PUT |
| VIDEO-04 | Video compressed before upload | NOT SATISFIED | `compressVideo()` is a passthrough stub |
| VIDEO-05 | Upload progress shown to user | SATISFIED (unreachable) | `UploadProgress` component rendered during upload in `record.tsx` |
| REVEAL-01 | Cannot see friend's video until both submitted | SATISFIED | RLS `count(*) = 2` gate on `question_responses` SELECT |
| REVEAL-02 | Push notification fires when both submit | NOT SATISFIED (deferred to Phase 3) | Edge Function exists but has no DB trigger wiring it |
| REVEAL-03 | User can watch friend's video | SATISFIED | `reveal.tsx` fetches response and renders `VideoPlayer` |
| REVEAL-04 | After watching, video deleted from storage | SATISFIED | `VideoPlayer.playToEnd` calls `storage.remove([storagePath])` |
| REVEAL-05 | Reveal-ready friendships shown first | SATISFIED | `useFriendships` priority sort: reveal_ready=0 |
| HOME-01 | Home screen lists friendships sorted by state priority | SATISFIED | Verified in `useFriendships` sort logic |
| HOME-02 | Each card shows friend name, streak count, question preview, state CTA | SATISFIED | `FriendshipCard` renders all four elements |
| HOME-03 | "Your Turn" cards show countdown | SATISFIED | `countdown` state in `FriendshipCard`, updates every 60s via setInterval |
| HOME-04 | "Reveal Ready" cards visually distinct | SATISFIED | Gold border (`stateRevealReady`), gold CTA pill, breathing pulse animation |

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `mobile/app/friendship/[id]/question.tsx` | 9 | `"Question screen — coming in 02-02"` placeholder text | BLOCKER | Entire `your_turn` user flow is dead — users cannot navigate to record.tsx |
| `mobile/hooks/useVideoUpload.ts` | 15-17 | `compressVideo()` returns input URI unchanged | WARNING | VIDEO-04 unmet; raw (uncompressed) video uploaded; higher storage/bandwidth cost |
| `mobile/hooks/useRevealSubscription.ts` | — | Hook exists but is never imported in any screen | WARNING | Realtime "reveal ready" detection is not active during recording; home screen only reflects state on next load/refetch |

---

### Human Verification Required

#### 1. Full core loop end-to-end (blocked by question.tsx gap)

**Test:** Once question.tsx is fixed — open the app as User A in a friendship with an active question. Tap the "Record Answer" CTA on the home screen card. Verify navigation goes to the question screen (not a placeholder), then to the record screen. Record a short video and submit. Switch to User B and do the same. Verify the home screen for both users updates to reveal_ready state.
**Expected:** Both users see the "Watch Now" CTA after both submit. Tapping it opens the friend's video. After watching, the video is deleted and the app returns to home.
**Why human:** Requires two authenticated simulator sessions, real Supabase connection, and camera access.

#### 2. Realtime reveal transition

**Test:** While User A is on the home screen (no manual refresh), User B submits their answer. Verify that User A's card transitions to reveal_ready without a manual reload.
**Expected:** Card updates within ~2 seconds via Supabase Realtime.
**Why human:** `useRevealSubscription` is not used in any screen — the home screen currently only reflects state at load time via `useFriendships`. This needs a human to confirm whether `useFriendships` is re-fetched in any realtime way, or if users must manually reload to see the reveal.

#### 3. Video deletion confirmation

**Test:** After watching a friend's video in the reveal screen, verify in the Supabase Storage dashboard that the file at `videos/{friendship_id}/{user_id}/{question_id}.mp4` no longer exists.
**Expected:** File is absent from the storage bucket.
**Why human:** Requires checking the storage dashboard after playback.

---

### Gaps Summary

Two blocking gaps prevent full goal achievement:

**Gap 1 (Blocker): `question.tsx` is a placeholder.** The most critical flow in Phase 2 — a user in `your_turn` state trying to record their answer — hits a dead screen. `record.tsx` is fully built, `VideoRecorder` is fully built, `useVideoUpload` works — but they are unreachable from the home screen because `question.tsx` (the bridge between home and record) was never implemented. This is a 20-30 line fix.

**Gap 2 (Warning): Video compression is stubbed.** `compressVideo()` bypasses `react-native-compressor` with a comment saying it needs a custom dev build. REQUIREMENTS.md incorrectly marks VIDEO-04 as complete. This is a minor issue for development but should be corrected in requirements tracking.

**Orphaned hook:** `useRevealSubscription` is a well-implemented Realtime hook that exists only in tests. The reveal screen works via direct DB fetch on load (functional) but doesn't use Realtime for live state transitions. This is a UX gap — users won't see the reveal_ready card appear without reloading the app.

All other Phase 2 deliverables are substantive and correctly wired: the DB schema, RLS policies, question rotation, useFriendships, FriendshipCard, VideoPlayer, reveal.tsx, and the design token system are all verified to exist, be non-placeholder, and have real data flowing through them.

---

_Verified: 2026-04-06T15:43:32Z_
_Verifier: Claude (gsd-verifier)_
