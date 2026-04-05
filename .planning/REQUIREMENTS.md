# Requirements: Reconnect

**Defined:** 2026-04-04
**Core Value:** Two friends answer a question in secret and experience the reveal together.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can sign up with email (magic link or OTP)
- [ ] **AUTH-02**: User can log in with existing account
- [ ] **AUTH-03**: User session persists across app restarts
- [ ] **AUTH-04**: User can log out
- [ ] **AUTH-05**: New user is prompted to set a username and display name after signup

### Profiles & Onboarding

- [ ] **PROF-01**: User has a profile with username, display name, and optional avatar
- [ ] **PROF-02**: User can update their display name and avatar
- [ ] **PROF-03**: After signup, user completes a short onboarding questionnaire (e.g. interests, hobbies, personality, relationship context) before reaching the home screen
- [ ] **PROF-04**: Onboarding answers are stored and used by the question selection algorithm to surface more personal, relevant questions for each user

### Friend System

- [x] **FRIEND-01**: User can search for another user by username
- [x] **FRIEND-02**: User can send a friend invite
- [x] **FRIEND-03**: User receives notification of a pending invite
- [x] **FRIEND-04**: User can accept or decline a friend invite
- [x] **FRIEND-05**: Accepted invite creates a friendship with streak_count = 0
- [x] **FRIEND-06**: User can see their list of current friendships

### Question Loop

- [x] **LOOP-01**: Each friendship has one active question at a time
- [x] **LOOP-02**: A new question is surfaced per friendship every 24 hours
- [x] **LOOP-03**: Question category (funny / deep / personal) is selected by weighted algorithm
- [x] **LOOP-04**: Users can like or dislike a question; rating feeds future selection
- [x] **LOOP-05**: Questions are not repeated within a friendship

### Video Recording & Upload

- [x] **VIDEO-01**: User can record a short video answer (max 30 seconds)
- [x] **VIDEO-02**: User can re-record before submitting
- [x] **VIDEO-03**: Video is uploaded to Supabase Storage with a signed URL
- [x] **VIDEO-04**: Video is compressed before upload
- [x] **VIDEO-05**: Upload progress is shown to the user

### Reveal Mechanic

- [ ] **REVEAL-01**: User cannot see their friend's video until both have submitted
- [ ] **REVEAL-02**: When both friends submit, a push notification fires: "Alex answered 👀"
- [ ] **REVEAL-03**: User taps the notification or reveal card to watch their friend's video
- [ ] **REVEAL-04**: After watching, the video is deleted from storage
- [ ] **REVEAL-05**: Reveal-ready friendships are shown first on the home screen

### Streaks & 24h Window

- [ ] **STREAK-01**: Each friendship tracks a streak_count
- [ ] **STREAK-02**: Streak increments when both friends answer within 24 hours
- [ ] **STREAK-03**: Streak resets to 0 if either friend misses the 24h window
- [ ] **STREAK-04**: Streak count is visible on each friendship card
- [ ] **STREAK-05**: At 4 hours remaining, a push notification warns: "Your streak with Alex is at risk 🔥"

### Push Notifications

- [x] **PUSH-01**: App registers for push notifications on first launch
- [x] **PUSH-02**: Push token stored in user profile
- [ ] **PUSH-03**: Streak-risk notification fires at 4h remaining (configurable via `STREAK_WARNING_HOURS`)
- [ ] **PUSH-04**: Reveal-ready notification fires when both friends have answered
- [ ] **PUSH-05**: Friend invite notification fires when a new invite is received

### Home Screen

- [x] **HOME-01**: Home screen lists all friendships sorted by state priority: Reveal Ready → Your Turn → Waiting
- [x] **HOME-02**: Each card shows: friend name, streak count, question preview, state CTA
- [x] **HOME-03**: "Your Turn" cards show time remaining with a countdown
- [ ] **HOME-04**: "Reveal Ready" cards are visually distinct (highlighted)

### Monetization — Sponsored Question Packs

- [ ] **SPONSOR-01**: Questions table supports `is_sponsored` and `brand_id` flags
- [ ] **SPONSOR-02**: Sponsored packs appear as a special category in the question feed
- [ ] **SPONSOR-03**: Sponsored questions are labelled (e.g. small brand badge)
- [ ] **SPONSOR-04**: Users can opt out of sponsored packs in settings

### Monetization — Friendship Gifts

- [ ] **GIFT-01**: At streak milestones (30, 60, 100, 365 days), a gift suggestion surfaces
- [ ] **GIFT-02**: Gift suggestions link to affiliate partners (coffee, flowers, experiences)
- [ ] **GIFT-03**: Tapping a gift opens the partner deep link or web URL
- [ ] **GIFT-04**: Gift prompt is dismissible and never shown more than once per milestone

## v2 Requirements

### Friendship Wrapped (Annual)
- Free base version: streak stats, question count, category breakdown
- Premium cinematic version (~$9.99 one-time)
- Shareable to social media

### Brand Moments (Seasonal Takeovers)
- Time-limited question events (Valentine's Day, summer, New Year)
- Brand exclusivity + elevated visual treatment

### Question Algorithm Improvements
- Per-user AND per-friendship preference learning
- Avoid questions answered recently across all friendships

### B2B Licensing
- API for therapists, dating apps, HR tools (post-userbase)

### Anonymized Data Reports
- Trend reports for media/research (post-userbase, opt-in)

## Out of Scope

| Feature | Reason |
|---|---|
| Group play (3+ users) | Complexity; validate 1:1 core loop first |
| Friendship Story / timeline | Deferred; build userbase first |
| Streak Gifting (buy shields for friend) | Rejected — conflicts with free-always feel |
| User-configurable cadence | 24h only in v1; simplicity wins |
| Public profiles | Privacy-first; everything between friends only |
| Leaderboards | Not aligned with intimacy-over-scale principle |

## Traceability

| Requirement | Phase |
|---|---|
| AUTH-01 to AUTH-05, PROF-01 to PROF-04 | Phase 1 |
| FRIEND-01 to FRIEND-06 | Phase 1 |
| LOOP-01 to LOOP-05, VIDEO-01 to VIDEO-05 | Phase 2 |
| REVEAL-01 to REVEAL-05 | Phase 2 |
| HOME-01 to HOME-04 | Phase 2 |
| STREAK-01 to STREAK-05 | Phase 3 |
| PUSH-01 to PUSH-05 | Phase 3 |
| SPONSOR-01 to SPONSOR-04 | Phase 4 |
| GIFT-01 to GIFT-04 | Phase 4 |

**Coverage:**
- v1 requirements: 47 total
- Mapped to phases: 47
- Unmapped: 0 ✓

---
*Defined: 2026-04-04*
