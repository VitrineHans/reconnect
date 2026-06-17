# Reconnect — Claude Instructions

## What is Reconnect?

A 1:1 friendship app that deepens real connections through daily ephemeral video Q&A. Think Duolingo for friendships — addictive, meaningful, **always free for users**.

Each friendship gets one question per day. Both friends record short video answers in secret. Neither sees the other's answer until both submit — then the reveal fires. Miss the 24-hour window → streak resets to 0, no exceptions. Video is deleted after watching.

> Full product spec: `docs/superpowers/specs/2026-04-04-reconnect-product-vision-design.md`
> GSD planning: `.planning/` (PROJECT.md, REQUIREMENTS.md, ROADMAP.md)

---

## Current Status (as of 2026-06-15)

**Phases 1–3 complete + an enhancement track (i18n → personalization → reveal push → settings/legal/unfriend → Groups → notification prefs). Monetization (orig. Phase 4) not started.**

Built & working (iOS simulator-verified):
- Auth/OTP, onboarding, profiles, avatar upload, friend invite/search
- Core loop: question engine, video record/upload, reveal mechanic
- Streaks (24h window via pg_cron) + streak-risk notification
- i18n (EN/NL full, ES/DE/FR fallback, in-app language switch); personalized question rotation (off-limits/depth/interests) — DB-verified
- Settings, Privacy/Terms, unfriend, notification on/off toggle
- **Groups** (small groups ≤8): schema/RLS, group rotation, progressive answer-to-unlock reveal, full UI

Still to do:
- **Monetization** — sponsored question packs, friendship gifts, Wrapped (orig. Phase 4)
- **E2E tests** (Playwright)
- **Verification** — RLS against a real Supabase instance; real-device + push (EAS `preview` build)

> Detailed state: `.planning/STATE.md`

---

## Product Principles

- **Intimacy over scale** — 1:1 first; small opt-in groups (≤8) added in v1 with progressive answer-to-unlock reveal and no group streaks. No large/public communities.
- **Free forever** — users never pay; no subscriptions, no paywalls, ever
- **Ephemeral** — videos deleted after watching; no archive
- **Authentic** — low friction, no editing, no perfectionism
- **Addictive but meaningful** — gamification serves connection

---

## Core Loop

```
Question drops (24h window opens)
     ↓
Both friends record video answers in secret
     ↓  (can't see partner's until both submit)
Both submitted → REVEAL fires → push notification
     ↓
Watch each other's videos → video deleted → streak +1
     ↓
New question in 24 hours
```

Miss the 24h window → streak resets to 0. No grace period.

**Primary hooks:** Streak (loss-aversion) + Reveal Moment (FOMO/curiosity)
**Deferred:** Friendship Story/timeline (v2+)

---

## Tech Stack (Confirmed)

| Layer | Choice |
|---|---|
| Mobile | React Native 0.81.5 via Expo 54 |
| Navigation | Expo Router 6 (file-based) |
| Video | Expo Camera / expo-video |
| Backend | Supabase (Auth + PostgreSQL + Realtime + Storage) |
| DB | PostgreSQL 17 via Supabase |
| Notifications | Expo Push Notifications |
| Testing | Playwright (E2E) + Jest + React Native Testing Library |

No separate backend API server — mobile talks directly to Supabase via RLS.

---

## Database Schema

Tables (`supabase/migrations/`):
- `profiles` — username, display_name, avatar_url, `push_token`, `onboarding_answers` (jsonb)
- `questions` — text, category (funny/deep/personal), `topics[]`, `depth` (1–5). **Monetization still needs**: `is_sponsored`, `brand_id`
- `friendships` — user_a, user_b (user_a < user_b), streak_count, `current_question_id`, `window_opened_at`
- `friend_invites` — from/to user, status (pending/accepted/declined)
- `question_responses` — `friendship_id` **xor** `group_id`, question_id, user_id, video_url, watched_at, `expires_at`
- `question_ratings` — user_id, question_id, rating (-1/1)
- `groups` / `group_members` — Phase 5 (additive; 1:1 path untouched)

RLS enabled on all tables. Server functions: `rotate_daily_questions()`, `rotate_group_questions()`, streak trigger + `reset_expired_streaks()` (pg_cron). Group RLS is verified via a role-based harness test (`supabase/tests/group_rls.test.sql`); rotation logic is verified on real Postgres (`supabase/tests/run_db_tests.sh`).

---

## Monetization (All free to users)

### Day-1
| Stream | Model |
|---|---|
| **Sponsored Question Packs** | Brands (Spotify, Airbnb, Nike) pay to sponsor themed question categories. Labelled, opt-out available. |
| **Friendship Gifts** | Affiliate commission 10–20% on gifts (coffee, flowers, experiences) surfaced at streak milestones. |
| **Friendship Wrapped** | Annual recap — free base, premium cinematic ~$9.99 one-time. Major organic marketing moment. |
| **Brand Moments** | Seasonal/holiday question takeovers with exclusivity pricing. |

### Later (post-userbase)
- B2B Licensing — therapists, dating apps, HR tools
- Anonymized Trend Data — aggregated reports; never individual; opt-in; disclosed at onboarding

### Explicitly rejected
- Streak shields / selling streak protection

---

## GSD Planning Structure

```
.planning/
├── PROJECT.md        ← Vision, constraints, key decisions
├── REQUIREMENTS.md   ← 47 v1 requirements (AUTH, FRIEND, LOOP, VIDEO, REVEAL, STREAK, PUSH, SPONSOR, GIFT)
├── ROADMAP.md        ← 4 phases with exit criteria
├── config.json       ← YOLO mode, coarse granularity, parallel, git-tracked
└── codebase/
    ├── STACK.md       ← Full dependency list with versions
    ├── INTEGRATIONS.md ← Supabase config, env vars, RLS details
    ├── ARCHITECTURE.md ← Layers, nav structure, data flow
    ├── STRUCTURE.md   ← Directory map, naming conventions
    ├── CONVENTIONS.md ← TypeScript, component, hook patterns
    ├── TESTING.md     ← Current state (no tests), what needs them
    └── CONCERNS.md    ← All placeholder code, missing DB fields, gaps
```

---

## Code Review Standards

After completing any implementation, review for:
- Functions longer than 30 lines (likely doing too much)
- Logic duplicated more than twice (extract to utility)
- Any `any` type in TypeScript (replace with real types)
- Components with more than 3 props that could be grouped into an object
- Missing error handling on async operations

Run /simplify before presenting code to the user.

---

## MCP Plugins in Use

| Plugin | Purpose |
|---|---|
| **Context7** | Up-to-date docs for React Native, Supabase, Expo |
| **Playwright** | E2E browser/app testing |
| **Superpowers** | Skills, brainstorming, GSD workflow |

Installed skills: `frontend-design`, `browser-use` (in `.claude/skills/`)

**Research rule:** Always use Context7 (`mcp__context7__resolve-library-id` + `mcp__context7__query-docs`) when researching any library, framework, or API used in this project — React Native, Expo, Supabase, Expo Router, expo-notifications, expo-camera, etc. Never rely on training data alone for library-specific details.

---

## Key Decisions

| Decision | Rationale |
|---|---|
| 24h window, hard reset, no grace period | Maximum loss-aversion; no exceptions reduces streak dilution |
| Secret until both answer | Drives completion; reveal is the dopamine hit |
| Free forever, brand monetization | No paywall friction; sponsored packs feel like content |
| No separate backend | Supabase handles everything; simpler architecture |
| 1:1 first; small groups (≤8) added in v1 | Validated the 1:1 loop first, then added opt-in groups (brainstormed): progressive answer-to-unlock reveal, no group streaks, additive tables |
| Max video length: 30s | Decided in requirements (was open question) |
| Users can re-record before submitting | Yes — confirmed in requirements |

## Open Questions

- [ ] Should questions surface simultaneously to both friends, or when each opens the app?
- [ ] How are sponsored packs visually disclosed — small badge, or explicit opt-in screen?
