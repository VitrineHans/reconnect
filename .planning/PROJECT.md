# Reconnect

## What This Is

Reconnect is a free mobile app (iOS + Android) that deepens 1:1 friendships through daily ephemeral video Q&A. Each friendship gets one question per day — both friends record short video answers in secret, then a reveal fires when both have submitted. Missing the 24-hour window resets the streak. No subscriptions, no paywalls, ever.

## Core Value

Two friends answer a question in secret and experience the reveal together — that moment of surprise and recognition is what makes Reconnect worth opening every day.

## Requirements

### Validated

(None yet — ship to validate)

### Active

See `REQUIREMENTS.md` for full list. Summary:

- Auth (signup, login, session persistence)
- Friend invite + acceptance flow
- Daily question surfacing (per friendship)
- Video recording + upload (ephemeral)
- Reveal mechanic (both must answer to unlock)
- Streak tracking with 24h window + reset
- Push notifications (streak risk + reveal ready)
- Sponsored question packs (brand monetization)
- Friendship Gifts (affiliate commerce at milestones)

### Out of Scope (v1)

- Group play (3+ users) — complexity; focus on 1:1 depth first
- Friendship Story / timeline — deferred; build userbase first
- B2B licensing — post-userbase revenue stream
- Anonymized data reports — post-userbase revenue stream
- Streak Gifting (buying shields) — rejected; conflicts with free-always principle feel
- User-configurable cadence — 24h is the only mode; simplicity over flexibility

## Context

- **Stack**: React Native (Expo), Expo Router, Supabase (Auth + DB + Storage + Realtime)
- **Codebase state**: Scaffold only. Auth guard, navigation shell, and DB schema exist. All screens are placeholders. Zero real features implemented.
- **DB schema**: 6 tables exist (`profiles`, `questions`, `friendships`, `friend_invites`, `question_responses`, `question_ratings`). Missing: `is_sponsored` flag on questions, `expires_at` on responses, push token storage, current question tracking on friendships.
- **Design**: Beautiful and playful UI is a stated priority. No design system exists yet — to be established in Phase 2.
- **Monetization**: Free forever for users. Revenue from sponsored question packs, friendship gifts (affiliate), Friendship Wrapped (annual), and seasonal brand takeovers.

## Constraints

- **Free forever**: Users never pay. All monetization is brand/affiliate-side.
- **Ephemeral video**: Videos must be deleted after watching — enforced at storage level, not just app level.
- **Platform**: Cross-platform (iOS + Android) from day one via Expo.
- **Privacy**: No public profiles. All data private between friends. RLS enforced on all tables.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| 24h answer window, hard reset | Maximum urgency and loss-aversion; no grace period reduces streak dilution | — Pending validation |
| Secret until both answer | Drives completion; reveal moment is the core dopamine hit | — Pending validation |
| Free forever, brand monetization | Removes paywall friction; sponsored packs feel like content not ads | — Pending validation |
| Supabase for backend | Auth + DB + Storage + Realtime in one service; no separate API server needed | ✓ Decided |
| Expo Router file-based nav | Standard for new Expo projects; simpler than React Navigation | ✓ Decided |
| 1:1 only in v1 | Depth over breadth; groups add complexity without validating core loop | ✓ Decided |

---
*Created: 2026-04-04*
