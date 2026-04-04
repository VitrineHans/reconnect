# Reconnect — Product Vision & Design Spec
**Date:** 2026-04-04  
**Status:** Approved

---

## What It Is

Reconnect is a 1:1 friendship app that deepens real connections through ephemeral video Q&A. It is always free for users — no subscriptions, no paywalls, no in-app purchases. Revenue comes entirely from brand partnerships, affiliate commerce, and data.

---

## Core Product Principles

- **Intimacy over scale** — designed for close friends, not followers
- **Free forever** — users never pay, ever
- **Low friction** — answer in seconds, no editing
- **Authentic** — ephemeral video removes performance pressure
- **Addictive but meaningful** — gamification serves connection, not just engagement

---

## The Daily Loop

One question per friendship, every 24 hours.

```
Question drops
     ↓
You record a secret video answer
     ↓
Friend records a secret video answer
     ↓  (neither can see the other's until both have answered)
Both answered → REVEAL fires → watch each other's videos
     ↓
Streak +1 · Video deleted after watching
     ↓
New question in 24 hours
```

**If either person misses the 24-hour window → streak resets to 0. No exceptions.**

The 24-hour window creates urgency. The secret-until-both-answer mechanic creates curiosity and drives completion.

---

## Primary Addiction Mechanics

### 1. The Streak 🔥
Each friendship has its own streak counter. Loss-aversion is the hook — a streak going to zero feels like a real loss shared between two people, not just one. Users are accountable to each other, not just to the app.

- Streak counter always visible on the friend card
- Push notification at ~12h if friend has answered but you haven't: *"Your streak with Alex is at risk 🔥"*
- Streak milestones (30, 60, 100, 365 days) trigger celebration moments and gift prompts

### 2. The Reveal Moment 🎭
You cannot see your friend's answer until you've submitted yours. When both have answered, a push fires: *"Alex answered 👀"* — this is the primary FOMO trigger. The reveal is the dopamine hit the whole loop builds toward.

- Reveal-ready friendships are always shown first on the home screen
- Video is ephemeral: deleted after the recipient watches it
- No archive — encourages authenticity over performance

---

## Home Screen States

Every friendship card on the home screen has one of three states, prioritized in this order:

| State | Trigger | Action |
|---|---|---|
| ✨ **Reveal Ready** | Both answered | Tap to watch — highest priority, shown first |
| ⏰ **Your Turn** | Friend answered, you haven't | Red CTA with countdown — streak pressure active |
| ⏳ **Waiting** | You answered, friend hasn't | Passive — app sends friend a nudge at 12h |

---

## Question Algorithm

- Questions are categorized: **funny / deep / personal**
- Users can like or dislike a question (feeds the algorithm)
- Algorithm learns preferences per user and per friendship over time
- Avoids repetition within a friendship
- Sponsored packs inject into the question feed as a special category (opt-in)

---

## Monetization

All revenue is generated without charging users.

### Day-1 Revenue Streams

**1. Sponsored Question Packs**  
Brands pay to sponsor themed question categories that appear as special drops in the question feed. Examples: *"Spotify: What song are you and your friend right now?"*, *"Airbnb: If you could go anywhere together, where?"*  
- Feels like curated premium content, not advertising  
- Brands pay per pack activation or per completed answer pair  
- Users can choose to engage or skip — never forced

**2. Friendship Gifts**  
At streak milestones (30, 60, 100, 365 days) or after an especially emotional/funny reveal, the app surfaces a contextual gift suggestion — coffee via Uber Eats, flowers, an experience via Airbnb. Reconnect earns affiliate commission (10–20%) on every completed purchase.  
- Spending is always optional  
- Gift prompt feels celebratory, never transactional  
- Deep integration with gift/commerce partners

**3. Friendship Wrapped**  
Once a year (annual event), Reconnect generates a shareable recap of each friendship — streak stats, highlights, question themes, funniest moments.  
- Free base version: stats and text highlights  
- Premium version (~$9.99 one-time): cinematic video edit, music, option for printed photo book  
- Massive organic marketing moment — users share on social, drives new signups  
- Brands can sponsor the Wrapped event itself (e.g. *"Friendship Wrapped, powered by Spotify"*)

**4. Brand Moments & Seasonal Takeovers**  
Brands sponsor limited-time question events tied to seasons or cultural moments — Valentine's Day (florists), summer travel (Booking.com), New Year (wellness brands). Exclusivity and time-scarcity justify premium CPM vs. evergreen sponsored packs.

### Later-Stage Revenue (post userbase)

**5. B2B Licensing**  
License the core relationship engine to:
- Couples therapists (homework between sessions)  
- Dating apps (post-match deepening)  
- Corporate HR (team culture, onboarding)  
- Family apps (grandparents ↔ grandkids, long-distance families)  
Priced per seat or per API call.

**6. Anonymized Trend Data**  
Aggregated, never individual. Sell insight reports to media, publishers, researchers, and brands:  
*"What topics do 18–25 year olds in close friendships discuss most in 2026?"*  
- Always disclosed in onboarding  
- Opt-out available  
- Zero personal or identifiable data ever sold

---

## What's Not in V1

- Group play (3+ users)
- Friendship Story / timeline (marked as optional — revisit after launch)
- User-configurable cadence (daily is the only mode for now)
- B2B licensing and data products (post-userbase)

---

## Key Data Models

| Model | Key Fields |
|---|---|
| `users` | id, profile, question preferences |
| `friendships` | user_a, user_b, streak_count, last_answered_at |
| `questions` | id, text, category (funny/deep/personal), is_sponsored, brand_id |
| `question_responses` | user_id, friendship_id, question_id, video_url, watched_at |
| `question_ratings` | user_id, question_id, rating (like/dislike) |
| `gifts` | friendship_id, triggered_by (streak_milestone/reveal), status, commission_amount |

---

## Open Questions (carry forward)

- [ ] Max video length? (15s / 30s?)
- [ ] Can users re-watch their own video before sending?
- [ ] What happens when one friend answers but the other doesn't for 24h — does a partial grace period exist?
- [ ] Should the question be revealed to both users simultaneously or staggered?
- [ ] Monetization: how are sponsored packs disclosed to users (label? opt-in screen?)?
