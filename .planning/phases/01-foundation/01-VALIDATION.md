---
phase: 1
slug: foundation
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + React Native Testing Library + jest-expo |
| **Config file** | `mobile/jest.config.js` — Wave 0 installs |
| **Quick run command** | `cd /Users/hanswagener/reconnect/mobile && npx jest --testPathPattern="(auth|profile|friends)" --passWithNoTests` |
| **Full suite command** | `cd /Users/hanswagener/reconnect/mobile && npx jest` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `cd mobile && npx jest --testPathPattern="(auth|profile|friends)" --passWithNoTests`
- **After every plan wave:** Run `cd mobile && npx jest`
- **Before `/gsd-verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | AUTH-01, AUTH-02 | T-OTP | OTP only, no magic link hash exploit | unit | `npx jest --testPathPattern=auth --passWithNoTests` | ❌ W0 | ⬜ pending |
| 1-01-02 | 01 | 0 | AUTH-03, AUTH-04 | T-SESSION | Session cleared on signOut | unit | `npx jest --testPathPattern=useSession --passWithNoTests` | ❌ W0 | ⬜ pending |
| 1-01-03 | 01 | 1 | AUTH-05, PROF-01 | T-RLS | Profile INSERT only for own uid | integration | `supabase db reset && supabase db test` | ❌ W0 | ⬜ pending |
| 1-01-04 | 01 | 1 | PROF-02 | — | N/A | unit | `npx jest --testPathPattern=profile --passWithNoTests` | ❌ W0 | ⬜ pending |
| 1-01-05 | 01 | 1 | PROF-03, PROF-04 | — | N/A | unit | `npx jest --testPathPattern=questionnaire --passWithNoTests` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 0 | PUSH-01, PUSH-02 | T-PUSH | Push token stored only for own profile | unit | `npx jest --testPathPattern=friends --passWithNoTests` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | FRIEND-01 | T-RLS | Username search excludes email/sensitive data | unit | `npx jest --testPathPattern=friends --passWithNoTests` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | FRIEND-02, FRIEND-04, FRIEND-05 | T-RLS | Invite INSERT only from_user=uid; UPDATE only to_user=uid | integration | `supabase db reset && supabase db test` | ❌ W0 | ⬜ pending |
| 1-02-04 | 02 | 1 | FRIEND-06 | — | N/A | unit | `npx jest --testPathPattern=friends --passWithNoTests` | ❌ W0 | ⬜ pending |
| 1-02-05 | 02 | 2 | FRIEND-03 | — | N/A — push delivery | manual | N/A | — | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `mobile/jest.config.js` — Jest config for Expo/React Native (jest-expo preset)
- [ ] `mobile/__tests__/auth.test.ts` — mocked `signInWithOtp` / `verifyOtp`; covers AUTH-01, AUTH-02
- [ ] `mobile/__tests__/useSession.test.ts` — session persistence + signOut; covers AUTH-03, AUTH-04
- [ ] `mobile/__tests__/layout.test.tsx` — auth guard routing stages; covers AUTH-05
- [ ] `mobile/__tests__/profile.test.ts` — profile fetch, update, questionnaire submit; covers PROF-01–04
- [ ] `mobile/__tests__/friends.test.ts` — username search, invite send/accept, friendships list; covers FRIEND-01, 02, 04, 05, 06
- [ ] Framework install: `cd mobile && npx expo install jest @testing-library/react-native @testing-library/jest-native jest-expo`

*No existing test infrastructure — full Wave 0 setup required.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Push notification fires on invite received | FRIEND-03 | Requires physical device + APNs/FCM entitlements + real Expo project ID; cannot be automated in Jest | 1. Install app on physical device via dev build. 2. User A sends invite to User B. 3. Verify User B receives push notification with correct title and body. |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
