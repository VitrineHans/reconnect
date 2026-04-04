# Roadmap: Reconnect

**Strategy:** Ship the core loop first, validate retention, then add monetization.
**Granularity:** Coarse — 4 phases, each independently shippable.
**Mode:** YOLO — autonomous execution, pause on blockers only.

---

## Phase 1 — Foundation
**Goal:** A user can sign up, create a profile, and connect with a friend.
**Requirements:** AUTH-01–05, PROF-01–02, FRIEND-01–06

### Plans

**1.1 — Auth & Profiles**
- Fix DB schema: add `push_token` to `profiles`, add `is_sponsored` + `brand_id` to `questions`, add `expires_at` + `current_round_id` to `question_responses`
- Implement login screen with Supabase magic link / OTP
- Implement signup → username setup flow
- Profile screen: display name, avatar (Supabase Storage)
- `useSession` already exists; wire it to real UI

**1.2 — Friend System**
- Username search (Supabase query)
- Send / accept / decline invite flow
- Friendship created on acceptance
- Friends list screen showing all active friendships
- Push token registration on first launch

**Exits Phase 1 when:** A test user can sign up, find a friend by username, and see an active friendship in their list.

---

## Phase 2 — The Core Loop
**Goal:** Two friends can answer a question via video and experience the reveal.
**Requirements:** LOOP-01–05, VIDEO-01–05, REVEAL-01–05, HOME-01–04

### Plans

**2.1 — Question Engine**
- Seed question library (50+ questions across funny / deep / personal)
- Question selection algorithm: weighted random by category, skip seen questions
- `current_question_id` assigned to friendship when new round starts
- Question like/dislike UI + rating stored

**2.2 — Video Recording & Upload**
- Integrate Expo Camera for video recording (max 30s)
- Re-record before submit
- Compress video (Expo ImageManipulator or expo-video)
- Upload to Supabase Storage with signed URL
- Upload progress indicator

**2.3 — Reveal Mechanic**
- Poll / Realtime subscription: detect when both friends have submitted
- Reveal-ready state fires push notification
- Video playback screen (partner's video unlocks after own submission)
- Video deleted from Storage after `watched_at` is set
- Home screen: friendship cards sorted by state (Reveal Ready → Your Turn → Waiting)

**2.4 — Design System**
- Establish colour palette, typography, spacing tokens
- Beautiful and playful visual language (dark-mode-first)
- Apply to all screens built in Phase 1 + 2
- Friendship card component with streak badge

**Exits Phase 2 when:** Two test users can complete a full loop end-to-end — question surfaced, both record videos, reveal fires, video plays and deletes.

---

## Phase 3 — Streaks & Notifications
**Goal:** The 24h mechanic and push notifications make the app genuinely addictive.
**Requirements:** STREAK-01–05, PUSH-01–05

### Plans

**3.1 — Streak Engine**
- 24h window enforced via `expires_at` on `question_responses`
- Supabase scheduled function (pg_cron or Edge Function): check expired rounds, reset streaks, start new round
- `streak_count` increments on mutual completion
- Streak display on friendship cards

**3.2 — Push Notifications**
- Expo Push Notifications integration
- Notification triggers:
  - Friend invite received
  - Reveal ready (both answered)
  - Streak risk (4h remaining, configurable)
- Notification routing: tap opens correct friendship

**Exits Phase 3 when:** A 24h cycle completes automatically, streaks increment/reset correctly, and push notifications fire reliably for reveal and streak-risk events.

---

## Phase 4 — Monetization v1
**Goal:** First revenue flowing. Sponsored packs live. Gift flow implemented.
**Requirements:** SPONSOR-01–04, GIFT-01–04

### Plans

**4.1 — Sponsored Question Packs**
- `is_sponsored` + `brand_id` fields on questions (DB migration)
- Admin seeding of first sponsored pack (e.g. Spotify-themed questions)
- Sponsored badge on question card
- Opt-out setting in profile

**4.2 — Friendship Gifts**
- Milestone detection (30, 60, 100, 365-day streaks)
- Gift suggestion card surfaces on home screen at milestone
- Affiliate deep-link integration (Uber Eats, Floward, Airbnb Experiences)
- Dismissible — shown once per milestone, never again

**Exits Phase 4 when:** A sponsored question appears in the feed with branding, and a gift suggestion surfaces correctly at a streak milestone with a working affiliate link.

---

## Post-v1 Backlog

| Item | Phase |
|---|---|
| Friendship Wrapped (annual recap) | v2 |
| Seasonal brand takeovers | v2 |
| Question algorithm: per-friendship learning | v2 |
| B2B API / licensing | v3 |
| Anonymized trend data reports | v3 |
| Friendship Story / timeline | v3 |

---

*Roadmap created: 2026-04-04*
*Next step: `/gsd-plan-phase 1` to generate detailed implementation plans for Phase 1*
