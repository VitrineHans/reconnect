# Phase 1: Foundation - Research

**Researched:** 2026-04-04
**Domain:** Supabase Auth (OTP/magic-link + deep linking), Expo Router navigation guards, user profiles & onboarding, friend invite system with RLS, Expo push token registration
**Confidence:** HIGH (stack confirmed, existing code reviewed, official docs consulted)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTH-01 | User can sign up with email (magic link or OTP) | Supabase `signInWithOtp` + `verifyOtp` — full flow documented below |
| AUTH-02 | User can log in with existing account | Same OTP/magic-link flow; `shouldCreateUser: false` for login-only path |
| AUTH-03 | User session persists across app restarts | Already implemented via `AsyncStorage` in `lib/supabase.ts` + `persistSession: true` |
| AUTH-04 | User can log out | `supabase.auth.signOut()` — trivial; triggers `onAuthStateChange` which auth guard already listens to |
| AUTH-05 | New user is prompted to set username and display name after signup | Needs onboarding route + post-signup check in auth guard |
| PROF-01 | User has profile with username, display name, optional avatar | `profiles` table exists; needs INSERT policy for new signup |
| PROF-02 | User can update display name and avatar | `profiles` UPDATE policy exists; needs profile screen UI |
| PROF-03 | After signup, user completes a short onboarding questionnaire (5–8 questions) | New screen + JSONB column on `profiles` table |
| PROF-04 | Onboarding answers stored and used by question selection algorithm | `onboarding_answers JSONB` column needed on `profiles`; no algorithm in Phase 1 — just storage |
| FRIEND-01 | User can search for another user by username | `profiles` table SELECT policy already `using (true)` — safe for username search |
| FRIEND-02 | User can send a friend invite | `friend_invites` INSERT policy needed; `from_user = auth.uid()` check |
| FRIEND-03 | User receives notification of a pending invite | PUSH-05 dependency; push token needed first (also in Phase 1) |
| FRIEND-04 | User can accept or decline a friend invite | `friend_invites` UPDATE policy for `to_user = auth.uid()` |
| FRIEND-05 | Accepted invite creates a friendship with streak_count = 0 | DB trigger or client-side logic; friendship INSERT + `user_a < user_b` ordering |
| FRIEND-06 | User can see their list of current friendships | `friendships` SELECT policy exists; UI needed in `friends.tsx` |
</phase_requirements>

---

## Summary

Phase 1 is the foundation layer: auth UI, user profiles, onboarding questionnaire, and the friend invite system. The codebase is a scaffold — navigation shell and database schema exist but all screens are placeholders with zero real functionality. Every screen in Phase 1 must be built from scratch.

The Supabase schema covers the core tables (`profiles`, `friendships`, `friend_invites`) but is missing four columns Phase 1 needs: `onboarding_answers` (JSONB) and `push_token` on `profiles`, and `is_sponsored`/`brand_id` on `questions` (the latter two can wait for Phase 4 but should be added in Phase 1 migration to avoid future breaking changes). The `friend_invites` table is missing INSERT, UPDATE, and DELETE RLS policies — only SELECT exists.

The most complex technical decision is auth: OTP numeric code entry is **strongly preferred** over magic links for Expo Router, because Expo Router strips URL hashes, which breaks the implicit token flow used by magic links. OTP (6-digit code entry with `verifyOtp`) sidesteps this entirely. PKCE is an alternative but adds complexity. Use OTP with a code-entry screen.

**Primary recommendation:** Email OTP (6-digit code) via `signInWithOtp` + `verifyOtp`. New user → username/display name screen → onboarding questionnaire (5–8 JSONB-stored questions) → home. Friend invites via username search → invite → accept/decline → friendship created. Push token registered at first app launch.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Directive |
|------------|-----------|
| Stack locked | React Native 0.81.5 / Expo 54 / Expo Router 6 / Supabase — no alternatives |
| No backend API server | Mobile talks directly to Supabase via RLS |
| Free forever | No paywalls, no subscriptions |
| 1:1 only | No groups in v1 |
| Cross-platform | iOS + Android from day one |
| Privacy-first | No public profiles; RLS on all tables |
| Code review standards | Functions ≤30 lines, no `any` types, async error handling required |
| Testing | Playwright (E2E) + Jest + React Native Testing Library |
| Design | Beautiful and playful; design system established in Phase 2 (Phase 1 uses plain but functional UI) |

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo` | ~54.0.33 | Managed RN environment | Project confirmed |
| `expo-router` | ~6.0.23 | File-based routing + auth guards | Project confirmed |
| `@supabase/supabase-js` | ^2.101.1 | Auth + DB client | Project confirmed |
| `@react-native-async-storage/async-storage` | 2.2.0 | Session persistence | Already configured in supabase client |

### Needs Installation (Phase 1)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `expo-notifications` | 55.0.16 (latest) | Push token registration | FRIEND-03, PUSH-01, PUSH-02 |
| `expo-device` | latest | Physical device check for push tokens | Required by expo-notifications |
| `expo-constants` | latest | Access projectId for push token | Required by expo-notifications |
| `expo-image-picker` | latest | Avatar upload from camera roll | PROF-02 |

**Installation:**
```bash
cd /Users/hanswagener/reconnect/mobile
npx expo install expo-notifications expo-device expo-constants expo-image-picker
```

**Version verification (2026-04-04):**
- `expo-notifications`: 55.0.16 [VERIFIED: npm registry]
- `@supabase/supabase-js`: 2.101.1 [VERIFIED: npm registry]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Email OTP (6-digit) | Magic link deep link | Magic link breaks in Expo Router (hash stripped); OTP is reliable |
| Email OTP | PKCE flow | PKCE works but adds a callback route and more complexity for same result |
| `expo-image-picker` | Camera for avatar | image-picker is simpler for gallery access; camera already covered by expo-camera |

---

## Architecture Patterns

### Route Structure for Phase 1

The existing structure needs one new route group and two new screens:

```
mobile/app/
├── _layout.tsx              # Existing — needs auth guard enhancement (onboarding check)
├── (auth)/
│   ├── _layout.tsx          # Existing
│   ├── login.tsx            # Replace placeholder — email input + send OTP
│   └── verify.tsx           # NEW — OTP code entry + verifyOtp call
├── (onboarding)/            # NEW route group
│   ├── _layout.tsx          # NEW
│   ├── username.tsx         # NEW — set username + display name (AUTH-05)
│   └── questionnaire.tsx    # NEW — 5–8 question flow (PROF-03, PROF-04)
└── (tabs)/
    ├── _layout.tsx          # Existing
    ├── home.tsx             # Existing placeholder — minimal update (show friendships later)
    ├── friends.tsx          # Replace placeholder — friend list + invite flow
    └── profile.tsx          # Replace placeholder — show profile + edit
```

### Pattern 1: Auth Guard with Onboarding Stage

The existing auth guard (in `_layout.tsx`) redirects on session only. Phase 1 needs a three-stage check:

```typescript
// Source: project conventions + Supabase auth pattern
// Stage 1: No session → login
// Stage 2: Session + no username → onboarding/username
// Stage 3: Session + username + no onboarding_answers → onboarding/questionnaire
// Stage 4: Fully onboarded → (tabs)/home

useEffect(() => {
  if (loading) return;
  const inAuth = segments[0] === '(auth)';
  const inOnboarding = segments[0] === '(onboarding)';

  if (!session && !inAuth) {
    router.replace('/(auth)/login');
  } else if (session && !profile?.username && !inOnboarding) {
    router.replace('/(onboarding)/username');
  } else if (session && profile?.username && !profile?.onboarding_answers && !inOnboarding) {
    router.replace('/(onboarding)/questionnaire');
  } else if (session && profile?.username && profile?.onboarding_answers && (inAuth || inOnboarding)) {
    router.replace('/(tabs)/home');
  }
}, [session, loading, profile]);
```

This requires `useProfile` hook alongside `useSession`.

### Pattern 2: Email OTP Auth Flow

**Why OTP over magic link:** Expo Router strips URL fragment hashes, which breaks the implicit token flow that magic links rely on. OTP codes delivered to a form input avoid this entirely. [CITED: github.com/expo/router/issues/724, supabase discussions #41133]

```typescript
// Step 1: Send OTP
const { error } = await supabase.auth.signInWithOtp({
  email: userEmail,
  options: {
    shouldCreateUser: true, // true = signup + login; false = login only
  },
});

// Step 2: Verify OTP on code entry screen
const { data, error } = await supabase.auth.verifyOtp({
  email: userEmail,
  token: sixDigitCode,
  type: 'email',
});
// On success: onAuthStateChange fires → auth guard redirects
```

**Supabase config note:** Email confirmation is already disabled in `supabase/config.toml` (`enable_email_confirmations = false` equivalent) — OTP still works; users must enter the code but email is not required to be "confirmed" separately. [VERIFIED: reading config.toml]

**app.json scheme:** Add `"scheme": "reconnect"` to `app.json` for deep link registration even though OTP doesn't need it — good hygiene for future OAuth/password-reset flows. [CITED: supabase.com/docs/guides/auth/native-mobile-deep-linking]

### Pattern 3: Profile Creation on Signup

Supabase Auth creates `auth.users` entries but not `profiles` rows. A database trigger is the standard pattern:

```sql
-- New migration: supabase/migrations/20260404000001_phase1_additions.sql
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, '', '');  -- empty username signals "needs onboarding"
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
```

**Alternative:** Client-side upsert after first login. Trigger is more reliable — avoids partial signup states where auth.users exists but profiles does not. [ASSUMED — trigger vs client-side is a pattern choice; both work]

### Pattern 4: Username Search with RLS

The existing `profiles` SELECT policy is `using (true)` — any authenticated user can read all profiles. This is correct for username search. Username is a UNIQUE NOT NULL column, so exact match search is safe and efficient: [VERIFIED: reading init.sql]

```typescript
// Username search — works with existing RLS
const { data, error } = await supabase
  .from('profiles')
  .select('id, username, display_name, avatar_url')
  .ilike('username', `%${query}%`)
  .limit(10);
```

**Security note:** `profiles` shows username, display_name, avatar_url only — no sensitive data. This is appropriate for a friend search. Do NOT expose email or internal IDs beyond the profile UUID. [VERIFIED: reading schema]

### Pattern 5: Friend Invite RLS Policies (MISSING — must add)

The `friend_invites` table has SELECT only. Phase 1 needs INSERT, UPDATE, and DELETE policies:

```sql
-- INSERT: only from_user can create an invite
create policy "Users can send invites"
  on public.friend_invites for insert
  with check (auth.uid() = from_user);

-- UPDATE: only to_user can accept/decline
create policy "Users can respond to invites"
  on public.friend_invites for update
  using (auth.uid() = to_user);

-- DELETE: either party can cancel (optional; sender can withdraw)
create policy "Users can cancel their own invites"
  on public.friend_invites for delete
  using (auth.uid() = from_user);
```

**Friendship creation on accept:** When `to_user` updates invite status to 'accepted', create the friendship. Two approaches:
1. **DB trigger** (recommended): triggers are atomic, no race condition
2. **Client-side**: update invite then insert friendship — vulnerable to partial failure

```sql
-- Trigger approach for friendship creation
create or replace function public.handle_invite_accepted()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friendships (user_a, user_b, streak_count)
    values (
      least(new.from_user, new.to_user),
      greatest(new.from_user, new.to_user),
      0
    )
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_invite_accepted
  after update on public.friend_invites
  for each row execute procedure public.handle_invite_accepted();
```

The `least()/greatest()` pattern enforces `user_a < user_b` constraint automatically. [VERIFIED: reading schema constraint `check (user_a < user_b)`]

### Pattern 6: Push Token Registration

```typescript
// Source: docs.expo.dev/push-notifications/push-notifications-setup/
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (!Device.isDevice) return null; // simulator — skip

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  return token;
}
```

**Storage:** Store in `profiles.push_token` column (needs migration). Update on every login since tokens can rotate. [CITED: docs.expo.dev/push-notifications/push-notifications-setup/]

**SDK 54 note:** Push notifications no longer work in Expo Go from SDK 54+. Testing requires a Development Build. [CITED: docs.expo.dev]

### Pattern 7: DB Migration for Phase 1

All schema additions go in a new migration file:

```sql
-- supabase/migrations/20260404000001_phase1_additions.sql

-- Push token storage
alter table public.profiles
  add column if not exists push_token text,
  add column if not exists onboarding_answers jsonb;

-- Add INSERT policy for profiles (trigger creates row, but manual upsert also needs it)
create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- Friend invite policies (INSERT, UPDATE, DELETE)
create policy "Users can send invites"
  on public.friend_invites for insert
  with check (auth.uid() = from_user);

create policy "Users can respond to invites"
  on public.friend_invites for update
  using (auth.uid() = to_user);

create policy "Users can cancel their own invites"
  on public.friend_invites for delete
  using (auth.uid() = from_user);

-- Friendships INSERT policy (needed for trigger's security definer context, and client fallback)
create policy "Friends can create friendships"
  on public.friendships for insert
  with check (auth.uid() = user_a or auth.uid() = user_b);

-- Trigger: auto-create profile on auth.users insert
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (new.id, '', '')
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger: create friendship when invite is accepted
create or replace function public.handle_invite_accepted()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'accepted' and old.status = 'pending' then
    insert into public.friendships (user_a, user_b, streak_count)
    values (least(new.from_user, new.to_user), greatest(new.from_user, new.to_user), 0)
    on conflict (user_a, user_b) do nothing;
  end if;
  return new;
end;
$$;

create trigger on_invite_accepted
  after update on public.friend_invites
  for each row execute procedure public.handle_invite_accepted();
```

### Anti-Patterns to Avoid

- **Magic link with Expo Router:** URL hash is stripped → token lost → silent auth failure [CITED: expo/router issue #724]
- **Client-side friendship creation on invite accept:** Race condition; use trigger instead
- **profiles INSERT without trigger:** `auth.users` entry without matching `profiles` row creates broken state that's hard to recover
- **Querying `auth.users` from client:** Not accessible via anon key; always use `profiles` table
- **Storing raw email OTP token client-side:** Only store session tokens (access_token, refresh_token) from `verifyOtp` response
- **Empty username allowed as "valid":** Auth guard must check `profile.username !== ''` not just `profile.username != null`

---

## Onboarding Questionnaire Design

**Requirement:** 5–8 questions that personalize the question engine (PROF-03, PROF-04).

The questions don't drive the question engine yet (Phase 2 builds that), but the answers must be stored so Phase 2 can use them. Store as JSONB in `profiles.onboarding_answers`.

**Recommended 6 questions:**

| # | Question | Key | Answer Type |
|---|----------|-----|-------------|
| 1 | "How long have you known each other?" | `friendship_length` | choice: just met / < 1 year / 1–3 years / 3+ years |
| 2 | "What do you usually talk about?" | `conversation_style` | multi-select: everyday stuff / deep life stuff / jokes / shared hobbies |
| 3 | "Pick your vibe" | `personality` | choice: laid-back / adventurous / thoughtful / spontaneous |
| 4 | "What matters most to you right now?" | `life_focus` | choice: career / relationships / health / creativity / travel |
| 5 | "How comfortable are you with deep questions?" | `depth_comfort` | scale 1–5 |
| 6 | "Any topics that are off-limits?" | `off_limits` | multi-select: family / work / money / relationships / health |

**Storage shape:**
```json
{
  "friendship_length": "3+",
  "conversation_style": ["jokes", "shared hobbies"],
  "personality": "adventurous",
  "life_focus": "travel",
  "depth_comfort": 4,
  "off_limits": ["money"]
}
```

[ASSUMED — question content is a product design decision; these are reasonable defaults that the question engine can use; confirm with user if different emphasis is wanted]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session persistence | Custom token storage | `AsyncStorage` + `persistSession: true` in supabase client | Already implemented correctly |
| Deep link URL parsing | Custom URI parser | `expo-linking` `Linking.useLinkingURL()` | Handles platform differences |
| Push token retrieval | Direct APNs/FCM calls | `expo-notifications` `getExpoPushTokenAsync` | Handles both platforms, manages project routing |
| OTP 6-digit input | Custom digit boxes | `TextInput` with `keyboardType="number-pad"` + `maxLength={6}` | Simple enough; no library needed |
| Avatar image picking | Custom camera UI | `expo-image-picker` | Already handles permissions + compression + cropping |
| `user_a < user_b` ordering | Client sort + validation | `least()/greatest()` in SQL trigger | Atomic, eliminates client race conditions |

**Key insight:** Supabase handles auth, session, and data access in one SDK. Do not introduce a separate state management layer (Redux, Zustand) in Phase 1 — custom hooks + React state is sufficient for this data volume.

---

## Common Pitfalls

### Pitfall 1: Magic Link Hash Stripping
**What goes wrong:** User taps magic link email → app opens → Expo Router strips URL fragment → `access_token` and `refresh_token` are gone → `setSession()` fails silently → user not logged in
**Why it happens:** Expo Router normalises URLs and discards fragments, which is where Supabase puts tokens in implicit flow
**How to avoid:** Use OTP (6-digit code) with `signInWithOtp` + `verifyOtp`. No URL parsing required.
**Warning signs:** Auth appears to succeed (email sent) but user stays on login screen after clicking link

### Pitfall 2: Missing profiles INSERT Policy
**What goes wrong:** New user signs up → `auth.users` row created → trigger fires → INSERT into `profiles` fails with RLS violation → profile row never created → app crashes when fetching profile
**Why it happens:** RLS blocks INSERT by default; triggers run as `security definer` which bypasses RLS for the trigger function itself, but only if the function has the right privileges
**How to avoid:** Trigger uses `security definer` (shown in migration above). Also add explicit INSERT policy as fallback.
**Warning signs:** Profile fetch returns null after successful OTP verification

### Pitfall 3: Username Uniqueness Race Condition
**What goes wrong:** Two users try to claim the same username simultaneously → both pass client-side "is this taken?" check → both INSERT → one gets a duplicate key error
**Why it happens:** Client-side uniqueness checks are not atomic
**How to avoid:** Rely on `UNIQUE` constraint on `profiles.username` column (already in schema). Catch the unique violation error (error code `23505`) and show "username taken" message.
**Warning signs:** Intermittent error on username submission with duplicate key message

### Pitfall 4: Push Token Not Working in Simulator
**What goes wrong:** Push token registration returns null on iOS Simulator / Android Emulator → `Device.isDevice` returns false → no token stored → FRIEND-03 notification never fires
**Why it happens:** APNs and FCM don't support simulators; Expo Push relies on them
**How to avoid:** Guard with `Device.isDevice` check (shown in Pattern 6). Test push on physical device or Development Build.
**Warning signs:** `registerForPushNotificationsAsync` returns null in dev

### Pitfall 5: `user_a < user_b` Constraint Violation
**What goes wrong:** Client creates friendship with `user_a = biggerUUID, user_b = smallerUUID` → PostgreSQL CHECK constraint rejects → friendship not created → invite accept appears broken
**Why it happens:** UUIDs don't have a natural order that's obvious to developers
**How to avoid:** Use `least()/greatest()` in the DB trigger (shown in Pattern 5). Never INSERT friendship directly from client.
**Warning signs:** `friend_invites` status updates to 'accepted' but `friendships` row doesn't appear

### Pitfall 6: Auth Guard Loops
**What goes wrong:** Auth guard redirects while profile is still loading → renders loop between `/login` and `/onboarding/username`
**Why it happens:** Guard fires on session change before profile data arrives
**How to avoid:** Add `profileLoading` state to `useProfile` hook; guard must wait for both `!loading && !profileLoading` before redirecting

### Pitfall 7: OTP `shouldCreateUser` Confusion
**What goes wrong:** Returning user enters email → new OTP sent → `shouldCreateUser: true` → duplicate auth.users creation attempted → Supabase dedupes, but user expects "login" flow not "signup" flow
**Why it happens:** `signInWithOtp` with `shouldCreateUser: true` is both signup and login for email OTP
**How to avoid:** Use `shouldCreateUser: true` always for a single screen approach; OR separate login/signup with `shouldCreateUser: false` for login. For simplicity: one screen, one method, `shouldCreateUser: true` — Supabase handles deduplication.

---

## Runtime State Inventory

> Phase 1 is greenfield — no rename/refactor involved.

N/A — this is a new feature build, not a migration/rename phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Build tooling | Yes | 22.17.1 | — |
| Supabase CLI | DB migrations | Yes | 2.40.7 | — |
| expo-notifications | PUSH-01, PUSH-02 | Not yet installed | 55.0.16 (npm) | — (must install) |
| expo-device | expo-notifications dep | Not yet installed | latest | — (must install) |
| expo-constants | expo-notifications dep | Not yet installed | latest | — (must install) |
| expo-image-picker | PROF-02 (avatar) | Not yet installed | latest | Skip avatar in Phase 1 if blocked |
| Physical device | Push token testing | [ASSUMED: available] | — | Simulator OK for auth/profile; push requires device |
| Playwright | E2E testing | Yes (global) | 1.54.2 | — |
| Jest | Unit testing | Not installed (no node_modules) | — | Install needed (Wave 0) |

**Missing dependencies with no fallback:**
- `expo-notifications`, `expo-device`, `expo-constants` — required for PUSH-01/PUSH-02; must `npx expo install` before implementation

**Missing dependencies with fallback:**
- `expo-image-picker` — avatar upload is optional (PROF-02 says "optional avatar"); can defer avatar UI to Phase 2

---

## Validation Architecture

nyquist_validation is enabled in config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest + React Native Testing Library (per CLAUDE.md) |
| Config file | None — needs Wave 0 setup |
| Quick run command | `cd /Users/hanswagener/reconnect/mobile && npx jest --testPathPattern=unit` |
| Full suite command | `cd /Users/hanswagener/reconnect/mobile && npx jest` |
| E2E framework | Playwright 1.54.2 (globally available) |
| E2E run command | `npx playwright test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTH-01 | `signInWithOtp` called with valid email → no error | unit | `npx jest --testPathPattern=auth` | Wave 0 |
| AUTH-02 | `verifyOtp` with valid 6-digit code → session returned | unit | `npx jest --testPathPattern=auth` | Wave 0 |
| AUTH-03 | Session retrieved from AsyncStorage on app restart | unit | `npx jest --testPathPattern=useSession` | Wave 0 |
| AUTH-04 | `signOut` called → session null → auth guard redirects to login | unit | `npx jest --testPathPattern=useSession` | Wave 0 |
| AUTH-05 | New user with empty username → redirected to onboarding/username | unit | `npx jest --testPathPattern=_layout` | Wave 0 |
| PROF-01 | Profile row created on signup (trigger fires) | integration (Supabase local) | `supabase db test` or manual | Wave 0 |
| PROF-02 | Profile update (display_name, avatar_url) succeeds with own auth | unit | `npx jest --testPathPattern=profile` | Wave 0 |
| PROF-03 | Questionnaire screen shows 6 questions, progresses through all | unit | `npx jest --testPathPattern=questionnaire` | Wave 0 |
| PROF-04 | onboarding_answers JSONB stored correctly in profiles | integration | `supabase db test` or manual | Wave 0 |
| FRIEND-01 | Username search returns matching profiles, excludes self | unit | `npx jest --testPathPattern=friends` | Wave 0 |
| FRIEND-02 | Friend invite INSERT succeeds when from_user = auth.uid() | integration | `supabase db test` or manual | Wave 0 |
| FRIEND-03 | Push notification fired on invite received | manual (requires device + push) | N/A — manual only | — |
| FRIEND-04 | Invite status updates to 'accepted'/'declined' by to_user | integration | `supabase db test` or manual | Wave 0 |
| FRIEND-05 | Friendship row created with streak_count=0 when invite accepted | integration | `supabase db test` or manual | Wave 0 |
| FRIEND-06 | Friendships list shows all friendships for current user | unit | `npx jest --testPathPattern=friends` | Wave 0 |

**FRIEND-03 manual only justification:** Push notification delivery requires a physical device, APNs/FCM entitlements, and a real Expo project ID. Cannot be automated in unit/integration context.

### Sampling Rate
- **Per task commit:** `cd /Users/hanswagener/reconnect/mobile && npx jest --testPathPattern=(auth|profile|friends) --passWithNoTests`
- **Per wave merge:** `cd /Users/hanswagener/reconnect/mobile && npx jest`
- **Phase gate:** Full jest suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `mobile/jest.config.js` — Jest configuration for Expo/React Native
- [ ] `mobile/__tests__/auth.test.ts` — covers AUTH-01, AUTH-02, AUTH-03, AUTH-04
- [ ] `mobile/__tests__/layout.test.tsx` — covers AUTH-05 (auth guard routing)
- [ ] `mobile/__tests__/useSession.test.ts` — covers AUTH-03, AUTH-04
- [ ] `mobile/__tests__/profile.test.ts` — covers PROF-01, PROF-02, PROF-03, PROF-04
- [ ] `mobile/__tests__/friends.test.ts` — covers FRIEND-01, FRIEND-02, FRIEND-04, FRIEND-05, FRIEND-06
- [ ] Framework install: `cd mobile && npx expo install jest @testing-library/react-native @testing-library/jest-native jest-expo` — no test framework in node_modules

---

## Security Domain

security_enforcement is not set to false — applying ASVS review.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Supabase Auth OTP — `signInWithOtp` + `verifyOtp`; token rotation enabled in config |
| V3 Session Management | Yes | `persistSession: true` + AsyncStorage; `autoRefreshToken: true`; 1h JWT expiry with rotation |
| V4 Access Control | Yes | RLS on all tables; `auth.uid()` in all policies; SELECT `using (true)` on profiles intentional for friend search |
| V5 Input Validation | Yes | Username: validate format before INSERT (alphanumeric + underscore, 3–20 chars); OTP: `maxLength={6}`, numeric only |
| V6 Cryptography | No | Supabase handles all crypto; no hand-rolled crypto |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User enumeration via OTP (does email exist?) | Information Disclosure | Supabase Auth returns identical response whether email exists or not [CITED: Supabase docs] |
| Invite spam (user sends 1000 invites) | DoS | `unique(from_user, to_user)` constraint prevents duplicate invites; rate limiting deferred to Phase 3 |
| Profile data exposure | Information Disclosure | SELECT `using (true)` is intentional for friend search; only expose username, display_name, avatar_url — no email/phone |
| Session fixation | Elevation of Privilege | Supabase JWT rotation on refresh; `enable_refresh_token_rotation = true` in config [VERIFIED: reading config.toml] |
| Push token theft | Spoofing | Push tokens stored in `profiles` with RLS; only own profile UPDATE allowed |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Magic link (implicit flow) | OTP numeric code OR PKCE flow | Expo Router v2 (2023) | Hash stripping makes implicit flow unreliable on mobile |
| Expo Go for push notification testing | Development Build required | Expo SDK 54 | Must use dev build for PUSH-01 testing |
| Manual session token storage | `persistSession: true` + AsyncStorage | supabase-js v2 | Already configured correctly in this project |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | DB trigger for profile creation is preferred over client-side upsert | Pattern 3 | If trigger pattern is wrong for this Supabase version, profile creation on signup could fail silently |
| A2 | Onboarding questionnaire content (6 specific questions) | Onboarding Design | Questions may not match product team's vision; answers schema may need restructuring |
| A3 | Avatar upload can be deferred (fallback noted) | Environment Availability | If PROF-02 is blocking for Phase 1 gate, expo-image-picker must be installed |
| A4 | Physical device available for push token testing | Environment Availability | If no physical device available, PUSH-01 cannot be tested until device obtained |
| A5 | `security definer` on trigger bypasses RLS for profile INSERT | Pattern 3 | If Supabase's managed PostgreSQL restricts `security definer` on triggers, trigger approach may fail |

---

## Open Questions

1. **OTP vs magic link as user-facing choice**
   - What we know: OTP (6-digit) is technically reliable; magic link is broken in Expo Router hash stripping
   - What's unclear: Whether product wants to revisit magic link using PKCE (adds complexity, needs `/auth/callback` route)
   - Recommendation: Use OTP in Phase 1; revisit if user feedback prefers magic link UX

2. **Onboarding questionnaire content**
   - What we know: PROF-03 requires 5–8 questions; PROF-04 says answers feed question selection algorithm
   - What's unclear: Exact questions and answer formats haven't been defined by product
   - Recommendation: Use the 6-question set defined in this research; treat as v1 that Phase 2 can refine

3. **Avatar storage bucket**
   - What we know: Supabase Storage is configured (50MiB limit); `avatar_url` column exists
   - What's unclear: No storage bucket or RLS policy for avatar images has been defined
   - Recommendation: Create `avatars` public bucket in migration; signed URL for upload, public URL for display

4. **Duplicate invite handling**
   - What we know: `unique(from_user, to_user)` prevents duplicate invites from same sender
   - What's unclear: What happens if User A already sent User B an invite and User B tries to send User A one? (reverse invite)
   - Recommendation: Before sending, check if invite already exists in either direction; show "invite already sent" or "they already invited you"

---

## Sources

### Primary (HIGH confidence)
- Reading `supabase/migrations/20260404000000_init.sql` — exact current schema verified
- Reading `mobile/lib/supabase.ts`, `mobile/hooks/useSession.ts`, `mobile/app/_layout.tsx` — existing implementation verified
- Reading `supabase/config.toml` via INTEGRATIONS.md — auth configuration verified
- [Supabase native mobile deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) — deep link flow
- [Supabase signInWithOtp reference](https://supabase.com/docs/reference/javascript/auth-signinwithotp) — OTP API
- [Expo push notifications setup](https://docs.expo.dev/push-notifications/push-notifications-setup/) — push token registration
- npm registry: expo-notifications@55.0.16, @supabase/supabase-js@2.101.1

### Secondary (MEDIUM confidence)
- [Expo Router hash stripping issue #724](https://github.com/expo/router/issues/724) — confirmed magic link breakage
- [Supabase discussion #41133](https://github.com/orgs/supabase/discussions/41133) — PKCE as workaround confirmed
- [Boardshape RLS invite system guide](https://boardshape.com/engineering/how-to-implement-rls-for-a-team-invite-system-with-supabase) — RLS patterns for invite systems

### Tertiary (LOW confidence — flagged as ASSUMED)
- Onboarding questionnaire question content — product design decision, not technically researched
- Trigger vs client-side profile creation preference — based on standard practice, not Supabase-specific doc

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry and existing package.json
- Auth flow (OTP): HIGH — confirmed via official Supabase docs + known Expo Router issue
- DB schema changes: HIGH — derived directly from reading the actual schema file
- RLS policies for invites: HIGH — derived from schema + RLS documentation patterns
- Push token registration: HIGH — official Expo docs consulted
- Onboarding questionnaire content: LOW — product design choice, not a technical finding

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (Expo + Supabase move fast; verify expo-notifications version if planning delays)
