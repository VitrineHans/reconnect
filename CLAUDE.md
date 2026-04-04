# Reconnect — Project Brief

## What is Reconnect?

Reconnect is a mobile app that strengthens relationships by having friends answer a funny, deep, or personal question via short video. It's built around streaks, ephemeral video, and a smart question algorithm — think BeReal meets Snapchat meets a relationship-building game.

---

## Core Features

### 1. Friend System
- Invite someone as a friend (one-to-one connection)
- Each friendship is its own streak

### 2. Video Q&A Loop
- A question is surfaced to both users
- Each user records and sends a short video answer
- Video is deleted after the recipient watches it (ephemeral)
- Neither user sees the other's answer until both have responded (or after a time window)

### 3. Question Algorithm
- Questions are categorized: funny / deep / personal
- Users can like or dislike a question
- Algorithm learns preferences per user and per friendship over time
- Questions should feel fresh — avoid repetition

### 4. Streaks & Gamification
- Answering keeps a streak alive (similar to Duolingo/Snapchat)
- Badges, milestones, streak shields
- Friendly nudges/notifications when a streak is at risk
- Leaderboards or shared stats between friends ("You've answered 42 questions together")

### 5. Ephemeral Video
- Videos are stored temporarily and deleted after being watched
- No permanent archive — encourages authenticity over performance

---

## Product Principles

- **Intimacy over scale** — designed for close friends, not followers
- **Low friction** — answer in seconds, no editing or perfectionism
- **Authentic** — ephemeral video removes pressure
- **Addictive but meaningful** — gamification serves connection, not just engagement

---

## Tech Stack (TBD — to be confirmed)

### Frontend
- **React Native** (Expo) — cross-platform iOS + Android
- Navigation: Expo Router
- Video recording: Expo Camera / expo-video

### Backend
- **Node.js** with **Fastify** or **Express**
- **Supabase** — auth, database (PostgreSQL), realtime, storage
- Video storage: Supabase Storage (with signed URLs + auto-delete policy)

### Algorithm
- Question scoring per user stored in DB
- Simple weighted scoring to start (likes/dislikes + recency)
- Can evolve to ML-based recommendations later

### Notifications
- **Expo Push Notifications** or Firebase Cloud Messaging
- Streak reminders, new question available, friend answered

### Testing
- **Playwright** — E2E testing
- Jest / React Native Testing Library — unit/component tests

---

## Key Data Models (Draft)

- `users` — profile, preferences
- `friendships` — user_a, user_b, streak_count, last_answered_at
- `questions` — text, category (funny/deep/personal), author
- `question_responses` — user_id, friendship_id, question_id, video_url, watched_at
- `question_ratings` — user_id, question_id, rating (like/dislike)

---

## MCP Plugins in Use

| Plugin | Purpose |
|---|---|
| **Context7** | Up-to-date docs for React Native, Supabase, Expo, etc. |
| **Playwright** | E2E browser/app testing automation |
| **Superpowers** | Extended Claude capabilities (file ops, scheduling, etc.) |

---

## Notes & Decisions

- Videos must be auto-deleted after watch — enforce at storage level, not just app level
- Start with iOS-first if needed, but design for cross-platform from day one
- Question library needs to be seeded manually first, algorithm improves over time
- No public profiles — everything is private between friends

---

## Open Questions

- [ ] Max video length? (15s? 30s?)
- [ ] Can you re-watch your own video before sending?
- [ ] What happens when one friend answers but the other doesn't for 24h?
- [ ] Monetization strategy? (Premium streaks, custom questions, etc.)
- [ ] Should questions be shown to both friends simultaneously or staggered?
