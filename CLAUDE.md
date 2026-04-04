# Reconnect — Claude Instructions

## What is Reconnect?

A 1:1 friendship app that deepens real connections through daily ephemeral video Q&A. Think Duolingo for friendships — addictive, meaningful, **always free for users**.

Each friendship gets one question per day. Both friends record short video answers in secret. Neither sees the other's answer until both submit — then the reveal fires. Miss the 24-hour window → streak resets to 0, no exceptions. Video is deleted after watching.

> Full product spec: `docs/superpowers/specs/2026-04-04-reconnect-product-vision-design.md`
> GSD planning: `.planning/` (PROJECT.md, REQUIREMENTS.md, ROADMAP.md)

---

## Current Status (as of 2026-04-04)

**Phase: Pre-development. GSD planning complete. Ready to start Phase 1.**

What exists:
- Expo Router navigation shell with auth guard
- Supabase schema (6 tables, RLS on all)
- `useSession` hook, Supabase client singleton
- All screens are **placeholders only** — no real features implemented

What needs building (4 phases):
- **Phase 1** — Auth UI, profiles, friend invite system
- **Phase 2** — Video loop, question engine, reveal mechanic, design system
- **Phase 3** — Streak engine (24h window), push notifications
- **Phase 4** — Sponsored question packs, friendship gifts

Run `/gsd-plan-phase 1` to start Phase 1 execution.

---

## Product Principles

- **Intimacy over scale** — 1:1 only in v1, no groups
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

## Database Schema (Confirmed)

Tables in `supabase/migrations/20260404000000_init.sql`:
- `profiles` — extends auth.users; username, display_name, avatar_url
- `questions` — text, category (funny/deep/personal); **needs**: `is_sponsored`, `brand_id`
- `friendships` — user_a, user_b (user_a < user_b), streak_count; **needs**: `current_question_id`
- `friend_invites` — from/to user, status (pending/accepted/declined)
- `question_responses` — friendship_id, question_id, user_id, video_url, watched_at; **needs**: `expires_at`
- `question_ratings` — user_id, question_id, rating (-1/1)

RLS enabled on all tables. Missing fields noted above need migration in Phase 1/2.

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

---

## Key Decisions

| Decision | Rationale |
|---|---|
| 24h window, hard reset, no grace period | Maximum loss-aversion; no exceptions reduces streak dilution |
| Secret until both answer | Drives completion; reveal is the dopamine hit |
| Free forever, brand monetization | No paywall friction; sponsored packs feel like content |
| No separate backend | Supabase handles everything; simpler architecture |
| 1:1 only in v1 | Validate core loop before adding group complexity |
| Max video length: 30s | Decided in requirements (was open question) |
| Users can re-record before submitting | Yes — confirmed in requirements |

## Open Questions

- [ ] Should questions surface simultaneously to both friends, or when each opens the app?
- [ ] How are sponsored packs visually disclosed — small badge, or explicit opt-in screen?
