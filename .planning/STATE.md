---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_plan: none
status: in-progress
stopped_at: Phase 5 (Groups) complete; Monetization (orig. Phase 4) not started
last_updated: "2026-06-15T00:00:00.000Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 10
  completed_plans: 8
  percent: 80
---

# Project State

## Current Position

- **Original roadmap:** Phases 1–3 (Foundation, Core Loop, Streaks) complete. Phase 4 **Monetization** (sponsored question packs, friendship gifts, Wrapped) **not started**.
- **Enhancement track** (added after the original roadmap, brainstormed + approved): i18n → personalization → reveal push → settings/legal/unfriend → **Groups** → notification prefs — all complete. E2E tests still pending.
- **Status:** App builds + runs clean on the iOS simulator (verified 2026-06-15).

## Progress

```
Original roadmap
  Phase 1: Foundation     [████████████████████] complete
  Phase 2: Core Loop      [████████████████████] complete (video loop, reveal, question engine)
  Phase 3: Streaks        [████████████████████] complete (24h window, push notifications)
  Phase 4: Monetization   [░░░░░░░░░░░░░░░░░░░░] not started

Enhancement track
  i18n (EN/NL full, ES/DE/FR fallback) ............ complete
  Personalization (tagged questions + rotation) ... complete (DB-verified)
  Reveal push (client-side) ....................... complete
  Settings / legal / unfriend ..................... complete
  Groups (schema, RLS, rotation, hooks, UI) ....... complete (UI sim-verified; RLS verified via role-based harness)
  Notification prefs toggle ....................... complete
  E2E tests (Playwright) .......................... not started
```

## Completed Work

| Area | Summary |
|------|---------|
| Foundation | Auth/OTP, onboarding wizard, profile, avatar upload, friend invite/search |
| Core Loop | Question engine, video record/upload, reveal mechanic, home data |
| Streaks | 24h window, server-side increment + expiry reset (pg_cron), streak-risk notification |
| i18n | i18next + expo-localization; EN/NL fully translated, ES/DE/FR fallback; in-app language switch (Settings) |
| Personalization | `questions.topics[]` + `depth`; `rotate_daily_questions()` honors off-limits/depth/interests — verified on real Postgres (`supabase/tests/run_db_tests.sh`) |
| Reveal push | Client-side push to the friend on 2nd submit (`notifyFriendOfReveal`); edge-fn documented as deploy-gated server alternative |
| Settings/legal | Settings screen (language, notifications, account), Privacy/Terms screens, unfriend flow |
| Groups | Additive `groups`/`group_members` + RLS; `rotate_group_questions()` (DB-verified); `useGroups`; create/Home cards/hub/record/progressive-reveal watch. No group streaks in v1. |

## Decisions (additions)

- **Groups reverse the original "1:1 only in v1" principle** — locked via brainstorm: progressive answer-to-unlock reveal, no group streaks, additive tables (1:1 untouched), max 8 members, any member invites, anyone leaves, creator removes, question skips the union of members' off-limits.
- Selection logic lives in `mobile/lib/questionSelection.ts` (unit-tested spec); SQL `rotate_*` functions mirror it 1:1.
- Group RLS uses SECURITY DEFINER helpers (`is_group_member`, `has_answered_group`) to avoid recursive-policy traps.
- Reveal push is client-side (no deploy needed); server edge-fn path is documented but inactive to avoid double-notify.
- Notification toggle: persisted locally; clears `push_token` when off so others can't push the device.

## Known gaps / needs verification

- **Group RLS is verified** via a role-based harness test (`supabase/tests/group_rls.test.sql`): stubbed `auth.uid()` + non-superuser role, asserting membership/roster visibility + answer-to-unlock. The older 1:1/storage policies follow the same patterns and could get equivalent tests, but aren't a known risk.
- **Personalization on an existing DB**: applying migrations runs `20260617000000_backfill_question_tags.sql`, which tags the existing question rows by text (re-running the seed would duplicate them). Verified on Postgres.
- **Real-device + push** can't be tested here — simulators can't receive push; it needs an EAS `preview` build + Apple/Expo credentials (environment limit, not a code defect).
- Phase 4 Monetization and Playwright E2E not started (future scope).

## Blockers

None.
