# Architecture

## Overall Pattern

Monorepo with two top-level workspaces:
- `mobile/` — React Native (Expo) mobile app
- `supabase/` — Backend: PostgreSQL schema, migrations, edge functions (none yet)

No separate backend service. All server-side logic runs through Supabase (Auth, DB, Realtime, Storage). The mobile app talks directly to Supabase via the JS SDK with Row-Level Security enforcing data access.

## Layers

```
┌─────────────────────────────────────┐
│         React Native UI             │  mobile/app/**/*.tsx
│   Expo Router (file-based nav)      │
├─────────────────────────────────────┤
│         Hooks / State               │  mobile/hooks/
│   (session, future: data hooks)     │
├─────────────────────────────────────┤
│         Supabase Client             │  mobile/lib/supabase.ts
│   Auth · DB queries · Storage       │
├─────────────────────────────────────┤
│         Supabase Cloud              │
│   PostgreSQL · RLS · Auth · Storage │
└─────────────────────────────────────┘
```

## Navigation Structure (Expo Router)

File-based routing under `mobile/app/`:

```
_layout.tsx          → Root layout: auth guard (redirect to login or home)
(auth)/
  _layout.tsx        → Auth stack
  login.tsx          → Login screen (placeholder — no form yet)
(tabs)/
  _layout.tsx        → Tab bar (Home, Friends, Profile)
  home.tsx           → "Your Questions" (placeholder)
  friends.tsx        → Friends list (placeholder)
  profile.tsx        → Profile (placeholder)
```

Auth guard lives in `mobile/app/_layout.tsx`: reads session from `useSession`, redirects unauthenticated users to `/(auth)/login` and authenticated users away from auth screens.

## Data Flow

1. App boots → `useSession` hook checks Supabase for existing session
2. Auth guard redirects based on session state
3. Screens (when implemented) will call Supabase directly via `mobile/lib/supabase.ts`
4. RLS policies on all tables enforce that users can only access their own data
5. Realtime subscriptions (not yet implemented) will push updates for reveal events

## Key Abstractions

- `mobile/lib/supabase.ts` — single Supabase client instance, shared across app
- `mobile/hooks/useSession.ts` — session state + auth state change listener
- `mobile/constants/index.ts` — shared constants (video duration, question categories, streak warning threshold)

## Entry Points

- `mobile/index.ts` → registers root component
- `mobile/App.tsx` → root component (delegates to Expo Router)
- `mobile/app/_layout.tsx` → routing and auth logic starts here
