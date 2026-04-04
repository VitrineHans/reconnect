# Testing

## Current State

**No tests exist.** The codebase is a scaffold with placeholder screens. No test files, no test runner configuration, no CI pipeline.

## Frameworks (Planned per CLAUDE.md)

- **Playwright** — E2E testing
- **Jest** — Unit/component tests
- **React Native Testing Library** — Component tests

## What Needs Tests (Priority Order)

### Critical (before any real users)
- `useSession` hook — auth state management, session persistence, cleanup
- Supabase client config — correct initialization, auth storage
- Auth guard logic in `mobile/app/_layout.tsx` — redirect rules

### High (core loop)
- Question response flow — submit answer, poll for partner answer, reveal
- Streak calculation — increment, reset on miss, milestone detection
- Video upload + signed URL generation

### Medium
- Friend invite flow — send, accept, decline
- Question algorithm — category selection, like/dislike weighting
- Push notification triggers

## Test File Conventions (to establish)

```
mobile/
├── __tests__/
│   ├── hooks/
│   │   └── useSession.test.ts
│   └── components/
│       └── FriendCard.test.tsx
├── e2e/
│   └── auth.spec.ts          # Playwright E2E
```

## Testing Gaps vs. Requirements

| Area | Status |
|---|---|
| Auth flow | ❌ No tests |
| Question loop | ❌ No tests |
| Streak logic | ❌ No tests |
| Video recording/upload | ❌ No tests |
| Friend system | ❌ No tests |
| Push notifications | ❌ No tests |
| DB migrations | ❌ No tests |
| RLS policies | ❌ No tests |
