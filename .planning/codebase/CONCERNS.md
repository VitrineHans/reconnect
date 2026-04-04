# Concerns

## Scaffold / Placeholder Code

All three tab screens are empty placeholders with no real functionality:

- `mobile/app/(tabs)/home.tsx` — renders "Your Questions" heading only. No question fetching, no friend cards, no reveal state.
- `mobile/app/(tabs)/friends.tsx` — renders "Friends" heading only. No friend list, no invite flow.
- `mobile/app/(tabs)/profile.tsx` — renders "Profile" heading only. No user data, no settings.
- `mobile/app/(auth)/login.tsx` — renders static text only. No auth form, no Supabase Auth UI, no OAuth.

**The entire app UI needs to be built from scratch.**

## Missing Core Features (vs. Product Spec)

| Feature | Status |
|---|---|
| Auth (login / signup / OTP) | ❌ Not implemented |
| Friend invite system | ❌ Not implemented |
| Question surfacing algorithm | ❌ Not implemented |
| Video recording (Expo Camera) | ❌ Not implemented |
| Video upload to Supabase Storage | ❌ Not implemented |
| Answer reveal mechanic | ❌ Not implemented |
| Streak tracking + display | ❌ Not implemented |
| Push notifications | ❌ Not implemented |
| Ephemeral video deletion | ❌ Not implemented |
| Sponsored question packs | ❌ Not implemented |
| Friendship Gifts flow | ❌ Not implemented |

## Database Concerns

- **No `is_sponsored` flag on `questions` table** — needed for monetization. Migration required.
- **No `expires_at` on `question_responses`** — needed for 24h window enforcement. Currently no mechanism to reset streaks.
- **No `current_question_id` on `friendships`** — no way to track which question a friendship is currently on.
- **Video deletion not enforced at DB level** — `watched_at` exists but no trigger or function auto-deletes the video from Storage after watching.
- **No push token storage** — no table or column for Expo push tokens.

## Security

- RLS enabled on all tables — good baseline.
- `question_responses` RLS policy uses a subquery on `friendships` — correct but should be tested with actual data to verify no bypass.
- `profiles` allows any user to view any profile (`select using (true)`) — acceptable for now but worth revisiting if private mode is added.
- Video signed URLs: expiry not yet configured in code. Should be short-lived (minutes, not hours).
- Env vars in `mobile/.env.example` include optional S3 and Twilio keys — these services aren't used yet; remove if not adopted.

## Performance

- No pagination implemented anywhere — all future queries need LIMIT/OFFSET or cursor-based pagination.
- No loading states in placeholder screens — will need skeleton loaders for perceived performance.
- Video files could be large — need compression before upload (Expo ImageManipulator or ffmpeg.wasm).

## Technical Debt

- No shared design tokens or theme — each screen uses hardcoded colours (`#fff`, `#666`). Needs a theme system before building real UI.
- No error boundary — any unhandled error will crash the app silently.
- No crash reporting / analytics configured (Sentry, PostHog, etc.).
- `mobile/components/` directory is empty — all components need to be created.
- No CI/CD pipeline — no automated tests, linting, or build checks on push.
