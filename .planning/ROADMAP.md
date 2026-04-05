# Roadmap: Reconnect

## Overview

Ship the core loop first, validate retention, then add monetization. Four phases: foundation (auth, profiles, onboarding, friends), core loop (video Q&A, reveal mechanic, design system), streaks and notifications, and monetization v1.

## Phases

- [ ] **Phase 1: Foundation** - Auth, onboarding questionnaire, profiles, and friend invite system
- [ ] **Phase 2: Core Loop** - Video recording, question engine, reveal mechanic, and design system
- [ ] **Phase 3: Streaks & Notifications** - 24h streak engine and push notifications
- [ ] **Phase 4: Monetization v1** - Sponsored question packs and friendship gifts

## Phase Details

### Phase 1: Foundation
**Goal**: A user can sign up, complete onboarding, and connect with a friend.
**Depends on**: Nothing (first phase)
**Requirements**: [AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, PROF-01, PROF-02, PROF-03, PROF-04, FRIEND-01, FRIEND-02, FRIEND-03, FRIEND-04, FRIEND-05, FRIEND-06]
**Success Criteria** (what must be TRUE):
  1. A test user can sign up with email OTP and land on the home screen
  2. New user completes an onboarding questionnaire (5–8 questions) that stores answers in their profile
  3. User can search for another user by username and send a friend invite
  4. Recipient can accept the invite and both users see an active friendship in their list
**Plans**: 2 plans

Plans:
- [ ] 01-01-PLAN.md — Auth & Profiles: DB migration, Jest setup, OTP auth screens, onboarding wizard, 4-stage auth guard, profile screen
- [x] 01-02-PLAN.md — Friend System: push token registration, username search, invite send/accept/decline, friendships list

### Phase 2: Core Loop
**Goal**: Two friends can answer a question via video and experience the reveal.
**Depends on**: Phase 1
**Requirements**: [LOOP-01, LOOP-02, LOOP-03, LOOP-04, LOOP-05, VIDEO-01, VIDEO-02, VIDEO-03, VIDEO-04, VIDEO-05, REVEAL-01, REVEAL-02, REVEAL-03, REVEAL-04, REVEAL-05, HOME-01, HOME-02, HOME-03, HOME-04]
**Success Criteria** (what must be TRUE):
  1. A question is surfaced to both friends in an active friendship
  2. Both users can record a 30s video answer and submit
  3. Neither can see the other's video until both have submitted
  4. When both submit, a push notification fires and the reveal card appears
  5. After watching, the video is deleted from storage
  6. Home screen lists friendship cards sorted by state priority
**Plans**: 4 plans

Plans:
- [x] 02-01-PLAN.md — Question Engine: DB migration (current_question_id, expires_at, fixed RLS, pg_cron), 54+ seed questions, useQuestion hook, useFriendships hook, home screen data wire-up
- [x] 02-02-PLAN.md — Video Recording & Upload: install expo-video/expo-file-system/react-native-compressor, VideoRecorder component, useVideoUpload hook (compress→ArrayBuffer→XHR+progress), record screen
- [ ] 02-03-PLAN.md — Reveal Mechanic: useRevealSubscription (Realtime postgres_changes), VideoPlayer (expo-video + deletion on playToEnd), FriendshipCard component, reveal screen, home screen upgrade
- [ ] 02-04-PLAN.md — Design System: frontend-design skill, tokens.ts (colours/typography/spacing/radii/shadows), apply to all Phase 1 + Phase 2 screens, FriendshipCard polish

### Phase 3: Streaks & Notifications
**Goal**: The 24h mechanic and push notifications make the app genuinely addictive.
**Depends on**: Phase 2
**Requirements**: [STREAK-01, STREAK-02, STREAK-03, STREAK-04, STREAK-05, PUSH-01, PUSH-02, PUSH-03, PUSH-04, PUSH-05]
**Success Criteria** (what must be TRUE):
  1. A 24h cycle completes automatically via scheduled function
  2. Streaks increment when both answer within 24h, reset to 0 on miss (no exceptions)
  3. Push notifications fire for: friend invite received, reveal ready, streak risk at 4h
  4. Tapping a notification opens the correct friendship screen
**Plans**: 2 plans

Plans:
- [ ] 03-01: Streak Engine — expires_at enforcement, pg_cron/Edge Function, streak_count logic
- [ ] 03-02: Push Notifications — Expo Push integration, token storage, notification triggers and routing

### Phase 4: Monetization v1
**Goal**: First revenue flowing. Sponsored packs live. Gift flow implemented.
**Depends on**: Phase 3
**Requirements**: [SPONSOR-01, SPONSOR-02, SPONSOR-03, SPONSOR-04, GIFT-01, GIFT-02, GIFT-03, GIFT-04]
**Success Criteria** (what must be TRUE):
  1. A sponsored question appears in the feed with a brand badge
  2. Users can opt out of sponsored packs in settings
  3. A gift suggestion surfaces at a streak milestone (30, 60, 100, 365 days)
  4. Tapping the gift card opens the affiliate deep link
  5. Gift prompt is dismissed and never shown again for that milestone
**Plans**: 2 plans

Plans:
- [ ] 04-01: Sponsored Question Packs — DB migration, sponsored badge, opt-out setting
- [ ] 04-02: Friendship Gifts — milestone detection, gift card, affiliate deep-link integration

---

*Roadmap created: 2026-04-04*
*Phase 1 planned: 2026-04-04 — 2 plans created, execute with `/gsd-execute-phase 1`*
*Phase 2 planned: 2026-04-05 — 4 plans created, execute with `/gsd-execute-phase 2`*
