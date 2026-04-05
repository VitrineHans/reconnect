---
phase: 02-core-loop
plan: "02"
subsystem: video
tags: [video, upload, camera, storage, react-native-compressor]
dependency_graph:
  requires: []
  provides: [VideoRecorder, useVideoUpload, UploadProgress, record-screen]
  affects: [02-03-reveal, home-screen]
tech_stack:
  added:
    - expo-video ~3.0.16
    - expo-file-system ~19.0.21 (legacy import path for EncodingType TS compat)
    - react-native-compressor ^1.16.0
    - base64-arraybuffer ^1.0.2
  patterns:
    - CameraView recordAsync with maxDuration in seconds (not ms)
    - ArrayBuffer upload via XHR for progress callbacks (Supabase SDK has no progress)
    - Storage path stored in DB (not signed URL) — signed URL generated fresh at reveal
key_files:
  created:
    - mobile/hooks/useVideoUpload.ts
    - mobile/components/VideoRecorder.tsx
    - mobile/components/UploadProgress.tsx
    - mobile/app/friendship/[id]/record.tsx
    - mobile/__tests__/useVideoUpload.test.ts
  modified:
    - mobile/package.json
    - mobile/app.json
decisions:
  - "Use expo-file-system/legacy import path to access EncodingType — the new SDK 54 entry point does not re-export it from the namespace"
  - "Store storage path in question_responses.video_url, not signed URL — signed URL generated fresh at reveal with 5-min expiry (T-02-02-05)"
  - "XHR PUT against signed URL for upload progress — Supabase JS SDK upload() has no progress callback in React Native"
metrics:
  duration_minutes: 7
  completed_date: "2026-04-05"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 2
---

# Phase 02 Plan 02: Video Recording and Upload Pipeline Summary

**One-liner:** CameraView 30s recorder with re-record flow, react-native-compressor compression, base64→ArrayBuffer→XHR upload with live progress to Supabase Storage.

## What Was Built

### Task 1: Package Installation
Installed four packages using `npx expo install` (for Expo-managed) and `npm install`:
- `expo-video ~3.0.16` — modern video playback (used in 02-03)
- `expo-file-system ~19.0.21` — base64 file reading for ArrayBuffer upload
- `react-native-compressor ^1.16.0` — video compression with Expo plugin
- `base64-arraybuffer ^1.0.2` — convert base64 string to ArrayBuffer

Added `react-native-compressor` to `app.json` plugins. iOS permission strings (`NSCameraUsageDescription`, `NSMicrophoneUsageDescription`) were already present from Phase 1.

### Task 2: Hook + Components + Screen (TDD)

**`useVideoUpload` hook** (`mobile/hooks/useVideoUpload.ts`)
- Exports: `useVideoUpload()` → `{ upload, progress, uploading, error }`
- Three module-level helpers (each ≤30 lines):
  - `compressVideo(uri)` — `VideoCompressor.compress` with `compressionMethod: 'auto'`
  - `readAsBase64(uri)` — `FileSystem.readAsStringAsync` with base64 encoding
  - `uploadWithProgress(signedUrl, arrayBuffer, onProgress)` — XHR PUT with `onprogress`
- Main `upload(friendshipId, userId, questionId, localUri)` orchestrates the full pipeline and returns the storage path `videos/{friendshipId}/{userId}/{questionId}.mp4`

**`VideoRecorder` component** (`mobile/components/VideoRecorder.tsx`)
- State machine: `'idle'` → `'recording'` → `'preview'`
- `CameraView` with `mode="video"` and `facing="front"`
- 30-second countdown timer via `setInterval` during recording
- Permission request UI when camera/mic not granted
- Buttons: Record / Stop / Re-record / Submit

**`UploadProgress` component** (`mobile/components/UploadProgress.tsx`)
- Props: `{ progress: number; visible: boolean }`
- Returns `null` when `visible=false`
- Horizontal progress bar (`width: ${progress}%`) with percentage label

**`record.tsx` screen** (`mobile/app/friendship/[id]/record.tsx`)
- Reads `id` (friendshipId) and `questionId` from route params
- On submit: compress → upload → insert `question_responses` → navigate to `/(tabs)/home`
- `question_responses` insert includes `expires_at = now() + 24h`
- Error state shows retry button

## Anti-Patterns Avoided

| Anti-pattern | Correct approach used |
|---|---|
| `Blob` / `FormData` upload | `ArrayBuffer` from base64 via `expo-file-system` + `base64-arraybuffer` |
| `maxDuration: 30000` (milliseconds) | `maxDuration: 30` (seconds — confirmed from Camera.types.ts) |
| Store signed URL in DB | Store storage path; generate signed URL fresh at reveal |
| Supabase SDK upload for progress | XHR PUT against signed URL with `xhr.upload.onprogress` |

## Test Results

```
PASS __tests__/useVideoUpload.test.ts
  useVideoUpload
    ✓ VIDEO-03: upload() resolves with correct storage path (36 ms)
    ✓ VIDEO-05: progress updates when XHR onprogress fires (4 ms)
    ✓ VIDEO-03: upload() rejects when XHR returns status 500 (4 ms)

Test Suites: 8 passed, 8 total
Tests:       46 passed, 46 total
```

## Commits

| Hash | Description |
|---|---|
| 57a751e | chore(02-02): install video recording and upload packages |
| 506db10 | feat(02-02): video recording, upload hook, and record screen |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `npx expo install` failed with peer dependency conflict**
- **Found during:** Task 1
- **Issue:** `expo-router@6.0.23` requires `expo-constants@^18.0.13` but project has `^55.0.11`
- **Fix:** Added `--legacy-peer-deps` flag — pre-existing version conflict unrelated to this plan's changes
- **Files modified:** None (install flag only)
- **Commit:** 57a751e

**2. [Rule 3 - Blocking] `react-test-renderer` version mismatch**
- **Found during:** Task 2 RED phase
- **Issue:** `@testing-library/react-native` detected `react-test-renderer@19.2.0` but expected `19.1.0`
- **Fix:** `npm install -D react-test-renderer@19.1.0 --legacy-peer-deps`
- **Files modified:** package.json, package-lock.json
- **Commit:** 506db10

**3. [Rule 1 - Bug] `expo-file-system` `EncodingType` TypeScript error**
- **Found during:** Task 2 TypeScript check
- **Issue:** A linter auto-changed `FileSystem.EncodingType.Base64` to `'base64' as FileSystem.EncodingType`. The new SDK 54 entry point (`expo-file-system`) does not re-export `EncodingType` from its namespace, causing `TS2694`.
- **Fix:** Changed import to `expo-file-system/legacy` which exports `EncodingType` correctly
- **Files modified:** `mobile/hooks/useVideoUpload.ts`
- **Commit:** 506db10

## Known Stubs

None — all components are fully wired. `record.tsx` inserts real `question_responses` rows and navigates on success.

## Threat Flags

No new surface beyond the plan's threat model. `question_responses` INSERT uses the authenticated user's session (RLS `WITH CHECK (auth.uid() = user_id)` from 02-01 migration covers T-02-02-01). Storage path includes `user_id` segment per T-02-02-02.

## Self-Check: PASSED
