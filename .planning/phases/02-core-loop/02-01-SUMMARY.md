---
phase: 02-core-loop
plan: 01
subsystem: question-engine
tags: [supabase, rls, pg_cron, hooks, home-screen, seeds]
dependency_graph:
  requires: [01-foundation]
  provides: [useQuestion, useFriendships, FriendshipWithState, FriendshipState, question-seed-data, videos-bucket, rotate_daily_questions]
  affects: [home.tsx, question_responses RLS, friendships schema]
tech_stack:
  added: []
  patterns: [useEffect-fetch, priority-sort, SECURITY-DEFINER-function, pg_cron-schedule, typed-supabase-joins]
key_files:
  created:
    - supabase/migrations/20260404000002_phase2_loop.sql
    - supabase/seeds/questions.sql
    - mobile/hooks/useQuestion.ts
    - mobile/hooks/useFriendships.ts
    - mobile/__tests__/useQuestion.test.ts
    - mobile/__tests__/useFriendships.test.ts
    - mobile/app/friendship/_layout.tsx
    - mobile/app/friendship/[id]/question.tsx
  modified:
    - mobile/app/(tabs)/home.tsx
    - mobile/hooks/useVideoUpload.ts
decisions:
  - "Used expo-file-system/legacy import in useVideoUpload.ts — new expo-file-system API removed EncodingType from root namespace"
  - "friendProfile fetched in separate query (fetchProfileMap) rather than join — avoids complex nested join type inference"
  - "question_responses SELECT RLS uses count(*) = 2 subquery for both-submitted gate — matches REVEAL-01 spec exactly"
metrics:
  duration_seconds: 343
  completed_at: "2026-04-05T08:26:39Z"
  tasks_completed: 3
  files_created: 10
  files_modified: 2
---

# Phase 02 Plan 01: Question Engine Foundation Summary

**One-liner:** DB migration with corrected REVEAL-01 RLS, pg_cron question scheduler, 54 seed questions, typed useFriendships/useQuestion hooks, and a FlatList-wired home screen replacing the placeholder.

---

## Tasks Completed

| Task | Name | Commit | Status |
|------|------|--------|--------|
| 1 | DB migration — schema additions, corrected RLS, pg_cron | 13d99b9 | Complete |
| 2 | [BLOCKING] Push migration to Supabase | — | Auto-approved (auto mode) |
| 3 | Seed questions + hooks + home screen wire-up | c2bd00d | Complete |

---

## Artifacts

### Migration: `supabase/migrations/20260404000002_phase2_loop.sql`
- `friendships.current_question_id` (uuid FK to questions)
- `question_responses.expires_at` (timestamptz)
- `question_responses` replica identity full (for Realtime UPDATE events)
- Private `videos` storage bucket with 3 RLS policies (INSERT/SELECT/DELETE)
- Replaced broad `question_responses` SELECT policy with REVEAL-01-compliant gate (count(*) = 2)
- Added `question_responses` INSERT + UPDATE and `question_ratings` INSERT + UPDATE + SELECT policies
- `pg_cron` extension + `rotate_daily_questions()` SECURITY DEFINER function
- `cron.schedule('rotate-daily-questions', '0 0 * * *', ...)`

### Seed Data: `supabase/seeds/questions.sql`
- 54 questions total: 18 funny / 18 deep / 18 personal
- Varied, genuine questions (not generic filler)
- Format: `INSERT INTO public.questions (id, text, category) VALUES (gen_random_uuid(), '...', '...')`

### Hook: `mobile/hooks/useQuestion.ts`
```typescript
export function useQuestion(friendshipId: string | null): UseQuestionResult
// Returns: { question: Question | null; loading: boolean; error: string | null; rateQuestion }
export interface Question { id: string; text: string; category: 'funny' | 'deep' | 'personal' }
```

### Hook: `mobile/hooks/useFriendships.ts`
```typescript
export function useFriendships(userId: string | null): UseFriendshipsResult
// Returns: { friendships: FriendshipWithState[]; loading: boolean; error: string | null; refetch }
export type FriendshipState = 'reveal_ready' | 'your_turn' | 'waiting'
export interface FriendshipWithState {
  id, friendId, friendProfile, streakCount, questionText, state, expiresAt, myResponseId
}
```
- Sorted by priority: reveal_ready=0, your_turn=1, waiting=2
- Friend profiles fetched in secondary query and merged via Map

### Screen: `mobile/app/(tabs)/home.tsx`
- FlatList wired to `useFriendships(userId)` — no longer a placeholder
- Renders FriendshipCard: friend name, streak count, question preview (60 char truncation), state CTA
- Loading indicator, error state, empty state all handled
- Reveal Ready items styled with purple accent

### Stubs (intentional)
- `mobile/app/friendship/[id]/question.tsx` — placeholder screen, implemented in 02-02
- `mobile/app/friendship/_layout.tsx` — empty Stack layout, stub for route structure

---

## Test Results

```
PASS __tests__/useFriendships.test.ts
PASS __tests__/useQuestion.test.ts

Tests: 12 passed, 12 total
```

**TypeScript:** `npx tsc --noEmit` — 0 errors

---

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed expo-file-system EncodingType import in useVideoUpload.ts**
- **Found during:** Task 3 (TypeScript check)
- **Issue:** `useVideoUpload.ts` (from Phase 1) used `FileSystem.EncodingType` via `import * as FileSystem from 'expo-file-system'`. The new expo-file-system v19 API removed `EncodingType` from the root namespace — it now lives in `expo-file-system/legacy`.
- **Fix:** A project linter automatically corrected the import to `expo-file-system/legacy`. The `'base64' as FileSystem.EncodingType` cast was retained as the legacy path exports the enum correctly.
- **Files modified:** `mobile/hooks/useVideoUpload.ts`
- **Commit:** c2bd00d

**2. [Rule 2 - Missing] friendProfile null fallback in useFriendships**
- **Found during:** Task 3 implementation
- **Issue:** If profile fetch fails or profile row missing, map lookup returns undefined
- **Fix:** Added `fallbackProfile` object using friendId as username when profile not in map
- **Files modified:** `mobile/hooks/useFriendships.ts`
- **Commit:** c2bd00d

---

## Security Notes (Threat Model Coverage)

| Threat ID | Status |
|-----------|--------|
| T-02-01-01 (Information Disclosure — question_responses SELECT) | Mitigated — new policy with count(*) = 2 gate |
| T-02-01-02 (Tampering — question_ratings upsert) | Mitigated — RLS WITH CHECK (auth.uid() = user_id) |
| T-02-01-03 (EoP — rotate_daily_questions SECURITY DEFINER) | Accepted — no user input, pg_cron only |
| T-02-01-04 (Spoofing — friendships query) | Mitigated — existing init migration RLS |

---

## pg_cron Availability Note

`pg_cron` is included in the Supabase free plan as a built-in extension. If `supabase db push` fails on the `create extension if not exists pg_cron` line, comment out the extension creation and the `cron.schedule(...)` call — question rotation can be triggered manually via the `rotate_daily_questions()` function until Phase 3 adds an Edge Function fallback.

---

## Known Stubs

| Stub | File | Reason |
|------|------|--------|
| Question screen placeholder | `mobile/app/friendship/[id]/question.tsx` | Intentional — implemented in 02-02 (video recording plan) |
| No navigation from FriendshipCard | `mobile/app/(tabs)/home.tsx` | Cards are TouchableOpacity but onPress not yet wired — navigation target (02-02) not yet built |

---

## Self-Check: PASSED

- `supabase/migrations/20260404000002_phase2_loop.sql` — EXISTS
- `supabase/seeds/questions.sql` — EXISTS (54 questions)
- `mobile/hooks/useQuestion.ts` — EXISTS
- `mobile/hooks/useFriendships.ts` — EXISTS
- `mobile/__tests__/useQuestion.test.ts` — EXISTS
- `mobile/__tests__/useFriendships.test.ts` — EXISTS
- `mobile/app/(tabs)/home.tsx` — MODIFIED (FlatList wired)
- Commit 13d99b9 — EXISTS
- Commit c2bd00d — EXISTS
- TypeScript: 0 errors
- Tests: 12/12 passing
