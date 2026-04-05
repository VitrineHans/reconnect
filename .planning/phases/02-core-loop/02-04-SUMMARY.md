---
phase: 02-core-loop
plan: "04"
subsystem: design-system
tags: [design, tokens, typography, fonts, styling]
dependency_graph:
  requires: [02-01-PLAN.md, 02-02-PLAN.md, 02-03-PLAN.md]
  provides: [design-system, ember-intimacy-tokens]
  affects: [all-screens, all-components]
tech_stack:
  added:
    - "@expo-google-fonts/fraunces ^0.x — display font (Fraunces 700 Bold)"
    - "@expo-google-fonts/plus-jakarta-sans ^0.x — body font family"
    - "expo-font — useFonts hook for async font loading"
  patterns:
    - "Token-based styling: all StyleSheet values sourced from mobile/theme/tokens.ts"
    - "useFonts() in root _layout.tsx with ActivityIndicator splash gate"
    - "Focused input border state via onFocus/onBlur + conditional style"
key_files:
  created: []
  modified:
    - mobile/app/_layout.tsx
    - mobile/app/(auth)/login.tsx
    - mobile/app/(auth)/verify.tsx
    - mobile/app/(onboarding)/username.tsx
    - mobile/app/(onboarding)/questionnaire.tsx
    - mobile/app/(tabs)/home.tsx
    - mobile/app/(tabs)/profile.tsx
    - mobile/app/(tabs)/friends.tsx
    - mobile/app/friendship/[id]/record.tsx
    - mobile/app/friendship/[id]/reveal.tsx
    - mobile/components/FriendshipCard.tsx
    - mobile/components/VideoRecorder.tsx
    - mobile/components/UploadProgress.tsx
decisions:
  - "Fraunces 700 Bold for display/headings — warm, literary, human serif; avoids generic sans defaults"
  - "Plus Jakarta Sans for body — legible, characterful, not Inter or Roboto"
  - "Ember (#F07B3A) as primary CTA colour on all screens; dark text on ember for contrast"
  - "Gold (#F5C442) for reveal-ready state glow and streak badge — feels like achievement"
  - "FriendshipCard streak badge always visible (even at 0) — matches test contract"
  - "FriendshipCard CTA text updated to match test contract: Watch Now, Record Answer, Waiting for..."
  - "Question preview shown without quotes — tests expect raw text"
  - "Font loading gate in _layout.tsx: show ember ActivityIndicator until fonts ready, then render Stack"
  - "--legacy-peer-deps required for Google Fonts install due to pre-existing peer dep conflicts"
metrics:
  duration_minutes: 25
  completed_date: "2026-04-05"
  tasks_completed: 3
  files_modified: 13
---

# Phase 2 Plan 04: Ember Intimacy Design System — Summary

Applied the "Ember Intimacy" design system across all Phase 1 and Phase 2 screens, installing Fraunces + Plus Jakarta Sans fonts and replacing every hardcoded hex/size/spacing value with tokens from `mobile/theme/tokens.ts`.

## Aesthetic Direction

**"Ember Intimacy"** — the warmth of a late-night conversation lit by candlelight.

- **Background:** `#0D0B09` warm near-black (not cold/blue-black)
- **Primary action:** `#F07B3A` ember amber-orange — candlelight warmth
- **Urgency / reveal:** `#E84560` flame rose-red — streak risk, destructive actions
- **Achievement:** `#F5C442` gold — streak badge, reveal-ready card glow
- **Text:** `#F0E8DC` warm off-white; `#8A7B6E` warm mid-gray secondary
- **Display font:** Fraunces 700 Bold — a warm, slightly "wonky" variable serif that feels human and literary
- **Body font:** Plus Jakarta Sans — clean, characterful, not Inter

## What Was Built

### Font loading (_layout.tsx)
- `useFonts()` loads all 6 font variants (Fraunces 700 Bold/Italic + PJS 400/500/600/700)
- Renders an ember-coloured `ActivityIndicator` on dark background until fonts are ready
- Auth guard now waits for `fontsLoaded` before redirecting

### Phase 1 screens (login, verify, username, questionnaire, profile, friends)
- All hardcoded `#fff`, `#000`, `#ddd`, `#666`, `#999` replaced with token values
- `fontFamily` set to `typography.families.*` throughout
- Input focus state via `onFocus`/`onBlur` → `borderColor: colors.ember`
- Labels in uppercase + wide letter-spacing for visual hierarchy
- Primary buttons: `colors.ember` background, `colors.bg` text for contrast
- Destructive (sign out): `colors.flame` text
- Progress bar in questionnaire: `colors.ember` fill on `colors.surface3` track

### Phase 2 screens (home, record, reveal)
- Home: dark background, Fraunces heading, ember loading indicator
- Record: black camera bg preserved; ember timer, ember record button, flame stop button
- Reveal: gold loading indicator with "Getting their answer..." label

### Components (FriendshipCard, VideoRecorder, UploadProgress)
- VideoRecorder: ember record button, flame stop button, ember timer text, permission screen uses design tokens
- UploadProgress: ember progress bar fill, surface3 track, 6px height
- FriendshipCard: CTA labels and streak badge updated to match test contract (see Deviations)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] FriendshipCard CTA labels did not match test contract**
- **Found during:** Task 2 (tests failed after first run)
- **Issue:** Existing card had `Watch now` / `Answer now →` / no waiting CTA; tests expected `Watch Now 👀` / `Record Answer` / `Waiting for {name}...`
- **Fix:** Updated all three CTA strings to match test expectations
- **Files modified:** `mobile/components/FriendshipCard.tsx`
- **Commit:** d82504d

**2. [Rule 1 - Bug] Streak badge hidden at count 0, but test expects it always visible**
- **Found during:** Task 2 (test `renders streak badge "🔥 0" when streakCount is 0` failed)
- **Issue:** `StreakBadge` returned `null` when count was 0; emoji and count were in separate `<Text>` nodes so `getByText('🔥 5')` failed
- **Fix:** Removed `if (count === 0) return null` guard; merged emoji + count into single text node `🔥 {count}`
- **Files modified:** `mobile/components/FriendshipCard.tsx`
- **Commit:** d82504d

**3. [Rule 1 - Bug] Question preview had curly quotes wrapping text, breaking test assertions**
- **Found during:** Task 2 (test `renders question text preview` failed)
- **Issue:** Preview rendered as `"What is your favourite movie?"` — quotes not in test string
- **Fix:** Removed surrounding quote characters from question preview render
- **Files modified:** `mobile/components/FriendshipCard.tsx`
- **Commit:** d82504d

**4. [Rule 3 - Blocking] Font install required --legacy-peer-deps**
- **Found during:** Task 0 font installation
- **Issue:** `npx expo install` exited non-zero due to pre-existing peer dep conflicts in project
- **Fix:** Used `npm install --legacy-peer-deps` instead (consistent with prior plan decisions)
- **Commit:** d82504d

## Known Stubs

None. All screens render real data from existing hooks and Supabase.

## Self-Check: PASSED

Files exist:
- `mobile/app/_layout.tsx` — FOUND
- `mobile/app/(auth)/login.tsx` — FOUND
- `mobile/app/(auth)/verify.tsx` — FOUND
- `mobile/app/(onboarding)/username.tsx` — FOUND
- `mobile/app/(onboarding)/questionnaire.tsx` — FOUND
- `mobile/app/(tabs)/home.tsx` — FOUND
- `mobile/app/(tabs)/profile.tsx` — FOUND
- `mobile/app/(tabs)/friends.tsx` — FOUND
- `mobile/app/friendship/[id]/record.tsx` — FOUND
- `mobile/app/friendship/[id]/reveal.tsx` — FOUND
- `mobile/components/FriendshipCard.tsx` — FOUND
- `mobile/components/VideoRecorder.tsx` — FOUND
- `mobile/components/UploadProgress.tsx` — FOUND

Commit d82504d exists: FOUND

TypeScript: 0 errors (`npx tsc --noEmit`)
Tests: 63/63 passing (`npx jest --passWithNoTests`)
Token imports: All 13 files import from `theme/tokens`
