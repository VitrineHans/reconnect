# Phase 2: Core Loop - Research

**Researched:** 2026-04-05
**Domain:** expo-camera video recording, Supabase Storage upload, Supabase Realtime postgres_changes, expo-video playback, question scheduling via pg_cron/Edge Functions
**Confidence:** HIGH (all primary API patterns verified from installed source files and official repos; no training data relied upon for API signatures)

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOOP-01 | Each friendship has one active question at a time | `current_question_id` column on `friendships`; DB migration needed |
| LOOP-02 | A new question is surfaced per friendship every 24 hours | pg_cron + Edge Function or PostgreSQL function triggers daily rotation |
| LOOP-03 | Question category selected by weighted algorithm | Client-side weighted random selection from `questions` table with `question_ratings` input |
| LOOP-04 | Users can like or dislike a question; rating feeds future selection | `question_ratings` table already exists; INSERT/UPSERT pattern |
| LOOP-05 | Questions are not repeated within a friendship | Track seen questions in `question_responses`; exclude seen question IDs in selection |
| VIDEO-01 | User can record a short video answer (max 30 seconds) | `CameraView.recordAsync({ maxDuration: 30 })` — maxDuration in seconds, confirmed |
| VIDEO-02 | User can re-record before submitting | Discard URI, call `recordAsync` again; no upload until explicit submit |
| VIDEO-03 | Video is uploaded to Supabase Storage with a signed URL | `createSignedUploadUrl` + `uploadToSignedUrl` flow; ArrayBuffer required for React Native |
| VIDEO-04 | Video is compressed before upload | `react-native-compressor` — has Expo plugin, supports managed workflow |
| VIDEO-05 | Upload progress is shown to the user | Custom XHR upload with `onprogress` callback; Supabase SDK upload does not expose progress |
| REVEAL-01 | User cannot see friend's video until both have submitted | RLS: `question_responses` SELECT policy only shows own response until reveal state |
| REVEAL-02 | Push notification fires when both friends submit | Edge Function triggered by DB trigger (after both responses inserted) |
| REVEAL-03 | User taps notification/reveal card to watch friend's video | `createSignedUrl(path, 300)` — 5-minute expiry; passed to `useVideoPlayer` |
| REVEAL-04 | After watching, video is deleted from storage | Client calls `supabase.storage.from('videos').remove([path])` after `onPlayToEnd`; also DB trigger to mark `watched_at` |
| REVEAL-05 | Reveal-ready friendships shown first on home screen | Query `friendships` with `question_responses` join; sort by state priority |
| HOME-01 | Home screen lists friendships sorted: Reveal Ready → Your Turn → Waiting | SQL query with CASE statement for state ordering |
| HOME-02 | Each card: friend name, streak count, question preview, state CTA | Join `friendships` + `profiles` + `questions` via `current_question_id` |
| HOME-03 | "Your Turn" cards show time remaining with countdown | `expires_at` on `question_responses`; compute time delta client-side |
| HOME-04 | "Reveal Ready" cards visually distinct | Component variant based on state; design system token for highlight colour |
</phase_requirements>

---

## Summary

Phase 2 builds the entire core product loop: question surfacing, 30-second video recording with re-record flow, upload to Supabase Storage, Realtime detection of "both submitted", reveal playback, ephemeral deletion, and the home screen that orchestrates all states.

The most complex technical decision is the video upload pipeline. Supabase's JS SDK upload does not expose an upload progress callback in React Native. The correct workaround is to use a raw `XMLHttpRequest` against the signed upload URL, which fires `onprogress` events. The upload format requires `ArrayBuffer` from a base64 string read via `expo-file-system` — the standard `Blob`/`FormData` approach silently produces 0-byte or corrupted uploads in React Native (confirmed in Supabase documentation and numerous community reports).

The reveal detection uses Supabase Realtime `postgres_changes` with a filter on `friendship_id`. The channel listens for `INSERT` events on `question_responses`; when a second INSERT for the same `friendship_id` + `question_id` arrives, the client queries the DB to confirm both responses exist and transitions to reveal state. A simpler alternative (polling every 5s) is also valid for MVP but Realtime is preferred.

Question scheduling uses a PostgreSQL function called by `pg_cron` at midnight UTC. The function iterates all friendships where `last_answered_at < now() - interval '24 hours'` (or that have never had a question), picks a new unasked question using a weighted algorithm, and updates `friendships.current_question_id`. This is a pure SQL/database approach — no Edge Function required for the scheduling itself.

**Primary recommendation:** `CameraView.recordAsync({ maxDuration: 30 })` → `expo-file-system` base64 → `ArrayBuffer` → XHR upload to signed URL with progress → Realtime `postgres_changes` INSERT filter for reveal detection → `useVideoPlayer` + `player.addListener('playToEnd', ...)` for deletion trigger.

---

## Project Constraints (from CLAUDE.md)

| Constraint | Directive |
|------------|-----------|
| Stack locked | React Native 0.81.5 / Expo 54 / Expo Router 6 / Supabase — no alternatives |
| No backend API server | Mobile talks directly to Supabase; Edge Functions are Deno serverless, not a persistent backend |
| No `any` types | TypeScript strict mode; all types must be explicit |
| Functions ≤30 lines | Applies to all Phase 2 functions |
| Async error handling required | All `async`/`await` must have try/catch or `.catch()` |
| Free forever | No paywalls in any UI |
| Context7 for all library research | Mandatory per CLAUDE.md — used throughout this research |
| Design system in Phase 2 | Phase 2 establishes colour palette, typography, spacing tokens, friendship card |

---

## Standard Stack

### Core (already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `expo-camera` | ~17.0.10 | Video recording via `CameraView` | Project confirmed; already in package.json |
| `expo-av` | ~16.0.8 | Legacy video playback (Video component) | Already installed; use for playback until expo-video installed |
| `@supabase/supabase-js` | ^2.101.1 | Storage upload, Realtime subscriptions, DB queries | Project confirmed |
| `expo-router` | ~6.0.23 | Navigation to record/reveal screens | Project confirmed |

### Needs Installation (Phase 2)

| Library | Version | Purpose | Why |
|---------|---------|---------|-----|
| `expo-video` | ~3.0.16 | Modern video playback with `useVideoPlayer` hook | Replaces legacy `expo-av` Video component; better events for detecting watch completion |
| `expo-file-system` | ~19.0.21 | Read video URI as base64 for ArrayBuffer upload | Required for Supabase Storage upload from React Native |
| `react-native-compressor` | ^1.16.0 | Video compression before upload | Has Expo plugin (app.plugin.js); reduces file size by ~60-80%; managed workflow compatible |
| `base64-arraybuffer` | ^1.0.2 | Convert base64 string to ArrayBuffer for upload | Required for Supabase Storage from React Native; Blob/FormData do not work reliably |

**Installation:**
```bash
cd /Users/hanswagener/reconnect/mobile
npx expo install expo-video expo-file-system
npm install react-native-compressor base64-arraybuffer
```

**app.json plugin addition for react-native-compressor:**
```json
{
  "expo": {
    "plugins": [
      "expo-router",
      "expo-camera",
      "react-native-compressor"
    ]
  }
}
```

**Version verification (2026-04-05):**
- `expo-video`: 3.0.16 — SDK 54 compatible (confirmed from expo/expo sdk-54 branch bundledNativeModules.json) [VERIFIED: npm registry + GitHub expo/expo sdk-54]
- `expo-file-system`: 19.0.21 — SDK 54 compatible (confirmed from expo/expo sdk-54 branch) [VERIFIED: GitHub expo/expo sdk-54]
- `base64-arraybuffer`: 1.0.2 [VERIFIED: npm registry]
- `react-native-compressor`: 1.16.0 [VERIFIED: npm registry]

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `expo-video` (new) | `expo-av` Video component (installed) | expo-av Video works for MVP; expo-video has cleaner hook API + reliable `playToEnd` event; prefer expo-video for Phase 2 |
| `react-native-compressor` | `ffmpeg-expo` | ffmpeg-expo is ~9MB APK increase; react-native-compressor is 50KB and has Expo plugin |
| XHR upload with progress | `tus-js-client` resumable uploads | tus is overkill for 30s clips (<30MB); XHR is simpler and sufficient |
| Realtime subscription | Client-side polling every 5s | Polling is simpler to implement and works for MVP; Realtime is preferred for instant reveal |
| pg_cron SQL function | Supabase Edge Function + pg_net | Pure SQL pg_cron has zero network overhead; Edge Function needed only if complex logic required |

---

## Architecture Patterns

### New Route Structure for Phase 2

```
mobile/app/
├── (tabs)/
│   ├── home.tsx                   # Replace placeholder — friendship cards, state list
│   └── ...
├── friendship/
│   ├── [id]/
│   │   ├── question.tsx           # View question, record/submit answer
│   │   ├── record.tsx             # CameraView fullscreen recording screen
│   │   └── reveal.tsx             # Reveal screen — watch friend's video
│   └── _layout.tsx
mobile/components/
├── FriendshipCard.tsx             # Home screen card (Reveal Ready / Your Turn / Waiting)
├── VideoRecorder.tsx              # Camera + recording controls
├── VideoPlayer.tsx                # Playback + deletion trigger wrapper
└── UploadProgress.tsx             # Progress bar during upload
mobile/hooks/
├── useFriendships.ts              # Fetch + sort friendships by state priority
├── useVideoUpload.ts              # compress → ArrayBuffer → XHR upload + progress
├── useRevealSubscription.ts       # Realtime postgres_changes subscription
└── useQuestion.ts                 # Fetch current question for a friendship
```

### Pattern 1: Video Recording with CameraView (expo-camera 17.x)

**What:** `CameraView` class component with `recordAsync` / `stopRecording`. Permissions via hooks.

**Key API facts (verified from source):**
- Component: `CameraView` (default export from `expo-camera`)
- Props: `mode="video"` required for video recording; `facing="front"` or `"back"`; `mute` for silent recording
- Permissions: `useCameraPermissions()` and `useMicrophonePermissions()` hooks (both exported from `expo-camera`)
- Recording: `cameraRef.current.recordAsync({ maxDuration: 30 })` — `maxDuration` is in **seconds** [VERIFIED: Camera.types.ts + GitHub issue #26865 confirms docs were wrong, implementation is seconds]
- Stop: `cameraRef.current.stopRecording()` — synchronous call that resolves the `recordAsync` promise
- Returns: `Promise<{ uri: string }>` — local file URI

```typescript
// Source: expo-camera/src/Camera.types.ts + expo-camera/src/CameraView.tsx
import { CameraView, useCameraPermissions, useMicrophonePermissions } from 'expo-camera';
import type { CameraViewRef } from 'expo-camera';
import { useRef } from 'react';

function VideoRecorder() {
  const cameraRef = useRef<CameraView>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [micPermission, requestMicPermission] = useMicrophonePermissions();

  const startRecording = async (): Promise<string | undefined> => {
    if (!cameraRef.current) return undefined;
    const result = await cameraRef.current.recordAsync({ maxDuration: 30 });
    return result?.uri;
  };

  const stopRecording = (): void => {
    cameraRef.current?.stopRecording(); // resolves recordAsync promise
  };

  return (
    <CameraView
      ref={cameraRef}
      style={{ flex: 1 }}
      mode="video"
      facing="front"
      mute={false}
    />
  );
}
```

**Permission plist entries required in app.json:**
```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "Reconnect needs camera access to record video answers.",
        "NSMicrophoneUsageDescription": "Reconnect needs microphone access to record video answers."
      }
    }
  }
}
```

### Pattern 2: 30-Second Cap with Visual Timer

`maxDuration: 30` auto-stops recording. Additionally use a `useEffect` timer countdown for UI feedback:

```typescript
// Source: project convention
const MAX_DURATION_MS = 30_000;

const [timeLeft, setTimeLeft] = useState(MAX_DURATION_MS);
const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

const onStartRecording = () => {
  timerRef.current = setInterval(() => {
    setTimeLeft((prev) => {
      if (prev <= 1000) {
        clearInterval(timerRef.current!);
        return 0;
      }
      return prev - 1000;
    });
  }, 1000);
};

const onStopRecording = () => {
  if (timerRef.current) {
    clearInterval(timerRef.current);
    timerRef.current = null;
  }
  setTimeLeft(MAX_DURATION_MS);
};
```

### Pattern 3: Video Compression (react-native-compressor)

```typescript
// Source: github.com/numandev1/react-native-compressor README
import { Video as VideoCompressor } from 'react-native-compressor';

const compressVideo = async (uri: string): Promise<string> => {
  const compressed = await VideoCompressor.compress(uri, {
    compressionMethod: 'auto',  // auto chooses best quality/size tradeoff
    maxSize: 1280,              // max width/height in pixels
  });
  return compressed; // returns local URI of compressed file
};
```

**Expected result:** ~30s video at 720p ≈ 30-50MB raw → 5-15MB after compression. [ASSUMED — compression ratio depends on device and content; treat as estimate]

### Pattern 4: Upload to Supabase Storage from React Native

**Critical:** `Blob` and `FormData` do not work reliably in React Native with Supabase Storage. Use `ArrayBuffer` from base64. [CITED: supabase.com/blog/react-native-storage]

**Two-step upload: (1) get signed URL, (2) XHR upload with progress:**

```typescript
// Source: Supabase storage-js source (StorageFileApi.ts) + official blog
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

// Step 1: Get a signed upload URL from Supabase (client must have INSERT on storage.objects)
const getSignedUploadUrl = async (path: string) => {
  const { data, error } = await supabase.storage
    .from('videos')
    .createSignedUploadUrl(path);
  if (error) throw error;
  return data; // { signedUrl: string, token: string, path: string }
};

// Step 2: Upload via XHR to get progress events (Supabase SDK .upload() has no progress)
const uploadWithProgress = (
  signedUrl: string,
  fileUri: string,
  onProgress: (pct: number) => void
): Promise<void> => {
  return new Promise(async (resolve, reject) => {
    const base64 = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    const arrayBuffer = decode(base64);

    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedUrl);
    xhr.setRequestHeader('Content-Type', 'video/mp4');
    xhr.setRequestHeader('x-upsert', 'false');

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(arrayBuffer);
  });
};
```

**Storage path convention:** `videos/{friendship_id}/{user_id}/{question_id}.mp4`

**Note on `uploadToSignedUrl` (SDK method):** This SDK method exists and works for upload without progress. Use XHR approach only when a progress indicator is needed (VIDEO-05 requires it).

### Pattern 5: Video Playback with expo-video

```typescript
// Source: github.com/expo/expo sdk-54 branch VideoPlayer.tsx + VideoPlayerEvents.types.ts
import { useVideoPlayer, VideoView } from 'expo-video';

function RevealScreen({ signedUrl, onWatched }: { signedUrl: string; onWatched: () => void }) {
  const player = useVideoPlayer(signedUrl, (p) => {
    p.play();
  });

  // Listen for video completion to trigger deletion
  player.addListener('playToEnd', () => {
    onWatched(); // caller calls storage.remove() + marks watched_at
  });

  return (
    <VideoView
      player={player}
      style={{ flex: 1 }}
      nativeControls={true}
      contentFit="contain"
    />
  );
}
```

**Available VideoPlayer events (verified from VideoPlayerEvents.types.ts):**
- `playToEnd` — fires when video reaches end; use this to trigger deletion
- `statusChange` — fires on status change (`idle` | `loading` | `readyToPlay` | `error`)
- `playingChange` — start/stop
- `timeUpdate` — periodic position update

**Signed URL for playback (use short expiry since video is ephemeral):**
```typescript
// Source: Supabase storage-js StorageFileApi.ts
const { data, error } = await supabase.storage
  .from('videos')
  .createSignedUrl(storagePath, 300); // 5-minute expiry
if (error) throw error;
const signedUrl = data.signedUrl;
```

### Pattern 6: Delete Video After Watching

```typescript
// Source: Supabase storage-js StorageFileApi.ts — remove() takes array of paths
const deleteVideo = async (storagePath: string): Promise<void> => {
  const { error } = await supabase.storage
    .from('videos')
    .remove([storagePath]);
  if (error) throw error;

  // Also update watched_at in DB
  await supabase
    .from('question_responses')
    .update({ watched_at: new Date().toISOString() })
    .eq('id', responseId);
};
```

**Note:** `remove()` takes an **array** of paths, not a single path. [VERIFIED: storage-js StorageFileApi.ts line 1059]

### Pattern 7: Supabase Realtime — Detect Both Submitted

**How it works:** Subscribe to `INSERT` events on `question_responses` filtered by `friendship_id`. When a new response comes in, check if both users have now responded for the current question.

```typescript
// Source: Supabase realtime-js RealtimeChannel.ts + official docs
import { supabase } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

const subscribeToResponses = (
  friendshipId: string,
  questionId: string,
  onBothSubmitted: () => void
): RealtimeChannel => {
  const channel = supabase
    .channel(`responses:${friendshipId}:${questionId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'question_responses',
        filter: `friendship_id=eq.${friendshipId}`,
      },
      async (_payload) => {
        // Verify both responses exist in DB (don't trust payload alone)
        const { data, error } = await supabase
          .from('question_responses')
          .select('user_id')
          .eq('friendship_id', friendshipId)
          .eq('question_id', questionId);

        if (!error && data && data.length === 2) {
          onBothSubmitted();
        }
      }
    )
    .subscribe();

  return channel;
};

// Cleanup on unmount:
// supabase.removeChannel(channel);
```

**RLS note for Realtime:** Postgres Changes does NOT use private channels — it uses RLS policies directly. The existing `question_responses` RLS policy (`exists (select 1 from friendships where ...)`) will govern what changes are delivered. Both friendship members will receive the events. [CITED: supabase.com/docs/guides/realtime/postgres-changes]

**Important limitation:** Cannot filter on `DELETE` events. Filtering only works for `INSERT`, `UPDATE`, and `*`. [CITED: supabase.com/docs/guides/realtime/postgres-changes — "Delete events are not filterable"]

**Replica identity:** For UPDATE events to include the old row, enable:
```sql
alter table public.question_responses replica identity full;
```

### Pattern 8: Question Selection Algorithm

**Goal:** Select a question that (a) has not been used in this friendship, (b) is weighted by category preferences.

```typescript
// Source: project convention + REQUIREMENTS.md LOOP-03, LOOP-05
type CategoryWeight = { funny: number; deep: number; personal: number };

const selectQuestion = async (
  friendshipId: string,
  weights: CategoryWeight
): Promise<string> => { // returns question id
  // Get IDs of already-used questions in this friendship
  const { data: used } = await supabase
    .from('question_responses')
    .select('question_id')
    .eq('friendship_id', friendshipId);

  const usedIds = (used ?? []).map((r) => r.question_id);

  // Pick a category based on weights
  const category = weightedRandom(weights); // e.g. 'funny' | 'deep' | 'personal'

  // Fetch candidate questions (exclude used)
  let query = supabase
    .from('questions')
    .select('id')
    .eq('category', category);

  if (usedIds.length > 0) {
    query = query.not('id', 'in', `(${usedIds.join(',')})`);
  }

  const { data: candidates, error } = await query.limit(20);
  if (error || !candidates?.length) throw new Error('No questions available');

  // Pick randomly from candidates
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx].id;
};
```

**Category weights formula:** Start 1/3 each; adjust ±0.1 based on thumbs-up/thumbs-down ratings from `question_ratings` table. Exact tuning is deferred — the schema supports it.

### Pattern 9: DB Migration for Phase 2

```sql
-- supabase/migrations/20260405000002_phase2_additions.sql

-- Add current_question_id to friendships (LOOP-01)
alter table public.friendships
  add column if not exists current_question_id uuid references public.questions(id);

-- Add expires_at to question_responses (HOME-03, STREAK context)
alter table public.question_responses
  add column if not exists expires_at timestamptz;

-- Enable replica identity full on question_responses (Realtime UPDATE events need old row)
alter table public.question_responses replica identity full;

-- Videos storage bucket (private — signed URLs only)
insert into storage.buckets (id, name, public)
values ('videos', 'videos', false)
on conflict (id) do nothing;

-- Storage RLS: friendship members can upload their own video
create policy "Friendship members can upload videos"
  on storage.objects for insert
  with check (
    bucket_id = 'videos'
    and auth.uid() is not null
  );

-- Storage RLS: friendship members can read videos (via signed URL, not direct)
create policy "Friendship members can read videos"
  on storage.objects for select
  using (bucket_id = 'videos' and auth.uid() is not null);

-- Storage RLS: owner can delete their own video
create policy "Users can delete own videos"
  on storage.objects for delete
  using (
    bucket_id = 'videos'
    and auth.uid()::text = (storage.foldername(name))[2]
  );
  -- Path is: videos/{friendship_id}/{user_id}/{question_id}.mp4
  -- foldername returns array of path segments; [2] = user_id

-- question_responses: INSERT policy (users can submit their own response)
create policy "Users can insert own responses"
  on public.question_responses for insert
  with check (auth.uid() = user_id);

-- question_responses: UPDATE policy (users can mark own response as watched)
create policy "Users can update own response"
  on public.question_responses for update
  using (auth.uid() = user_id);

-- question_ratings: INSERT and UPDATE policies
create policy "Users can insert own ratings"
  on public.question_ratings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own ratings"
  on public.question_ratings for update
  using (auth.uid() = user_id);
```

### Pattern 10: Question Scheduling via pg_cron

**Approach:** A PostgreSQL function runs daily at midnight UTC. It finds all friendships that need a new question (no `current_question_id` set, or the previous round has expired) and assigns one.

```sql
-- supabase/migrations/20260405000003_question_cron.sql

-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Function: assign a new question to friendships that need one
create or replace function public.rotate_daily_questions()
returns void language plpgsql security definer as $$
declare
  f record;
  q_id uuid;
begin
  for f in
    select id, user_a, user_b
    from public.friendships
    where
      -- No current question assigned
      current_question_id is null
      -- OR both users have responded (round complete)
      or (
        select count(*)
        from public.question_responses r
        where r.friendship_id = friendships.id
          and r.question_id = friendships.current_question_id
      ) = 2
  loop
    -- Pick a question not previously used in this friendship
    select q.id into q_id
    from public.questions q
    where q.id not in (
      select question_id
      from public.question_responses
      where friendship_id = f.id
    )
    order by random()
    limit 1;

    if q_id is not null then
      update public.friendships
      set current_question_id = q_id
      where id = f.id;
    end if;
  end loop;
end;
$$;

-- Schedule: run every day at midnight UTC
select cron.schedule(
  'rotate-daily-questions',
  '0 0 * * *',
  $$ select public.rotate_daily_questions(); $$
);
```

**Note on category weights:** The initial version uses `order by random()`. Category weighting (LOOP-03) is added in a follow-up by replacing `order by random()` with a weighted query incorporating `question_ratings`. The schema supports this immediately.

**Note on pg_cron plan availability:** pg_cron is available on Supabase free plan as a built-in extension. [ASSUMED — Supabase free plan includes pg_cron based on general knowledge; verify at supabase.com/pricing if critical]

### Pattern 11: Home Screen Query — Sorted by State Priority

```typescript
// Source: project convention
// States: 'reveal_ready' > 'your_turn' > 'waiting'

type FriendshipState = 'reveal_ready' | 'your_turn' | 'waiting';

type FriendshipWithState = {
  id: string;
  friendProfile: { username: string; display_name: string; avatar_url: string | null };
  streakCount: number;
  questionText: string | null;
  state: FriendshipState;
  expiresAt: string | null;
  myResponseId: string | null;
};

const fetchFriendshipsWithState = async (userId: string): Promise<FriendshipWithState[]> => {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      streak_count,
      user_a,
      user_b,
      current_question_id,
      questions!current_question_id ( text ),
      question_responses ( id, user_id, watched_at, expires_at )
    `)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (error) throw error;

  return (data ?? []).map((f) => {
    const responses = f.question_responses ?? [];
    const myResponse = responses.find((r) => r.user_id === userId);
    const friendId = f.user_a === userId ? f.user_b : f.user_a;
    const bothResponded = responses.length === 2;
    const iSubmitted = Boolean(myResponse);

    let state: FriendshipState;
    if (bothResponded) {
      state = 'reveal_ready';
    } else if (!iSubmitted) {
      state = 'your_turn';
    } else {
      state = 'waiting';
    }

    return {
      id: f.id,
      friendId,
      streakCount: f.streak_count,
      questionText: (f.questions as { text: string } | null)?.text ?? null,
      state,
      expiresAt: myResponse?.expires_at ?? null,
      myResponseId: myResponse?.id ?? null,
    };
  }).sort((a, b) => {
    const priority = { reveal_ready: 0, your_turn: 1, waiting: 2 };
    return priority[a.state] - priority[b.state];
  });
};
```

### Anti-Patterns to Avoid

- **Using `Blob` or `FormData` for React Native upload to Supabase Storage:** Produces 0-byte or corrupted uploads silently. Always use `ArrayBuffer` from base64. [CITED: Supabase docs + community reports]
- **Relying on Realtime payload for sensitive state:** Realtime payload may be delayed or arrive out of order. Always re-query the DB to confirm state after receiving a Realtime event.
- **Calling `stopRecording()` before `recordAsync()` resolves:** `stopRecording()` must be called while `recordAsync()` is still awaiting. Calling before recording starts has no effect.
- **Creating a Realtime channel after `subscribe()` is called:** Registering `.on()` handlers after `.subscribe()` throws an error. Always add all `.on()` handlers before `.subscribe()`. [VERIFIED: realtime-js RealtimeChannel.ts — throws `cannot add postgres_changes callbacks after subscribe()`]
- **Using `expo-av` Video component for reveal (in new code):** The legacy `expo-av` `Video` component has less reliable `onPlaybackStatusUpdate`. Use `expo-video` `useVideoPlayer` + `playToEnd` event.
- **Setting `video_url` in `question_responses` to a public URL:** Videos must be private. Store the storage path (not a signed URL), and generate short-lived signed URLs on demand.
- **Running the question rotation on the client:** Race condition risk — two clients could both trigger rotation simultaneously. Run rotation server-side via pg_cron only.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Video compression | Custom FFmpeg pipeline | `react-native-compressor` | Has Expo plugin; ~1.16.0; handles iOS/Android differences internally |
| Base64 → ArrayBuffer conversion | Manual atob loop | `base64-arraybuffer` `decode()` | Known-correct implementation; avoids off-by-one in manual implementations |
| Camera permissions | Direct `PermissionsAndroid` calls | `useCameraPermissions()`, `useMicrophonePermissions()` from `expo-camera` | Cross-platform hook; handles status + request in one hook |
| Video playback events | Polling `currentTime` to detect end | `player.addListener('playToEnd', ...)` in `expo-video` | Reliable event; no polling loop |
| Weighted random selection | Anything complex | Simple probability normalisation function | 30 lines max; not a library problem |
| Storage path generation | Ad hoc string construction | Consistent convention: `videos/{friendship_id}/{user_id}/{question_id}.mp4` | Predictable path for RLS and deletion |

**Key insight:** The upload pipeline (compress → read → convert → upload) has many failure modes on React Native. Every step needs explicit error handling. Do not chain these as one async function > 30 lines — split into `compressVideo`, `readAsBase64`, `uploadWithProgress` as separate named hooks.

---

## Common Pitfalls

### Pitfall 1: maxDuration Units Confusion
**What goes wrong:** Developer passes `maxDuration: 30000` (milliseconds) instead of `30` (seconds) → video stops after 8 hours, not 30 seconds
**Why it happens:** Documentation bug (GitHub issue #26865) caused confusion; docs now say seconds but older tutorials say ms
**How to avoid:** Use `maxDuration: 30` (seconds). Confirmed in `Camera.types.ts`: `/** Maximum video duration in seconds. */ maxDuration?: number;` [VERIFIED: Camera.types.ts line 202]
**Warning signs:** Recording never auto-stops at 30s; timer UI hits 0 but recording continues

### Pitfall 2: Zero-Byte Upload with Blob/FormData
**What goes wrong:** Video uploads to Supabase Storage successfully (no error returned) but file is 0 bytes or corrupted
**Why it happens:** React Native's `fetch` and `XMLHttpRequest` have incomplete `Blob`/`FormData` implementations; Supabase's storage server receives malformed body
**How to avoid:** Always use `FileSystem.readAsStringAsync(uri, { encoding: EncodingType.Base64 })` → `decode(base64)` → `ArrayBuffer` [CITED: supabase.com/blog/react-native-storage]
**Warning signs:** Upload returns success but `video_url` is empty when fetched; video playback shows nothing

### Pitfall 3: Realtime Subscription Registered After Subscribe
**What goes wrong:** App crashes with `cannot add postgres_changes callbacks after subscribe()`
**Why it happens:** Realtime channels lock their configuration once `subscribe()` is called [VERIFIED: RealtimeChannel.ts]
**How to avoid:** Chain all `.on()` calls before the final `.subscribe()`. Wrap subscription creation in a single function.
**Warning signs:** Error thrown synchronously when `.on()` is called on an already-subscribed channel

### Pitfall 4: Realtime Subscription Memory Leak
**What goes wrong:** Each time the component re-mounts (navigation back/forth), a new Realtime subscription is created without removing the old one → multiple callbacks fire per event
**Why it happens:** Channel cleanup requires explicit `supabase.removeChannel(channel)`
**How to avoid:** In `useEffect`, return cleanup function: `return () => { supabase.removeChannel(channel); }`
**Warning signs:** `onBothSubmitted` fires multiple times for a single event; notification fires 2-3 times

### Pitfall 5: video_url Signed URL Expiry
**What goes wrong:** Friend opens reveal screen 10 minutes after notification → signed URL has expired → video fails to load with 403
**Why it happens:** `createSignedUrl` expiry is a fixed duration from creation time, not from watch time
**How to avoid:** Do NOT store the signed URL in the database. Store only the storage path. Generate a fresh signed URL when the user opens the reveal screen.
**Warning signs:** Video loads for one user but not another; intermittent 403 errors on video load

### Pitfall 6: Missing question_responses INSERT RLS Policy
**What goes wrong:** User submits response → client calls `supabase.from('question_responses').insert(...)` → RLS blocks it → response never stored → reveal never fires
**Why it happens:** The init migration has only a SELECT policy on `question_responses` (via the `for all` policy using a subquery), but `with check` is missing for inserts that originate from the client
**How to avoid:** The Phase 2 migration adds an explicit `for insert with check (auth.uid() = user_id)` policy [see Pattern 9]
**Warning signs:** Insert returns 403 or no error but row not created

### Pitfall 7: Storage RLS Path Mismatch
**What goes wrong:** Upload to `videos/{friendship_id}/{user_id}/{question_id}.mp4` → DELETE policy uses `foldername(name)[2]` for user_id check → path segments indexed from 1, not 0 → DELETE fails
**Why it happens:** `storage.foldername()` returns array starting at index 1 in PostgreSQL
**How to avoid:** Verify segment indexes: path `videos/abc/def/ghi.mp4` → `foldername` = `{abc, def}` → `[1]` = `abc` (friendship_id), `[2]` = `def` (user_id). See Phase 2 migration.
**Warning signs:** Delete policy throws RLS error even for own video

### Pitfall 8: CameraView Not in Video Mode
**What goes wrong:** `recordAsync()` is called → camera is in `mode="picture"` (default) → behavior is undefined or silently fails
**Why it happens:** `CameraView` defaults to `mode='picture'` [VERIFIED: CameraView.tsx defaultProps]
**How to avoid:** Always set `mode="video"` on the `CameraView` component before calling `recordAsync()`

---

## Code Examples

### Full Upload Hook (compress → convert → upload with progress)

```typescript
// Source: Verified patterns from installed packages + official docs
// hooks/useVideoUpload.ts
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { Video as VideoCompressor } from 'react-native-compressor';
import { supabase } from '@/lib/supabase';

type UploadOptions = {
  localUri: string;
  friendshipId: string;
  userId: string;
  questionId: string;
  onProgress: (pct: number) => void;
};

type UploadResult = {
  storagePath: string;
  publicUrl: string | null;
};

export const uploadVideo = async ({
  localUri,
  friendshipId,
  userId,
  questionId,
  onProgress,
}: UploadOptions): Promise<UploadResult> => {
  // Step 1: Compress
  const compressedUri = await VideoCompressor.compress(localUri, {
    compressionMethod: 'auto',
    maxSize: 1280,
  });

  // Step 2: Get signed upload URL
  const storagePath = `${friendshipId}/${userId}/${questionId}.mp4`;
  const { data: signedData, error: signError } = await supabase.storage
    .from('videos')
    .createSignedUploadUrl(storagePath);
  if (signError) throw signError;

  // Step 3: Read as base64 → ArrayBuffer → XHR upload with progress
  const base64 = await FileSystem.readAsStringAsync(compressedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const arrayBuffer = decode(base64);

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', signedData.signedUrl);
    xhr.setRequestHeader('Content-Type', 'video/mp4');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error(`Upload failed: ${xhr.status}`));
    xhr.onerror = () => reject(new Error('Upload network error'));
    xhr.send(arrayBuffer);
  });

  return { storagePath, publicUrl: null };
};
```

### Realtime Subscription Hook

```typescript
// hooks/useRevealSubscription.ts
import { useEffect, useRef } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export const useRevealSubscription = (
  friendshipId: string,
  questionId: string,
  onBothSubmitted: () => void
): void => {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!friendshipId || !questionId) return;

    channelRef.current = supabase
      .channel(`responses:${friendshipId}:${questionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'question_responses',
          filter: `friendship_id=eq.${friendshipId}`,
        },
        async () => {
          const { data } = await supabase
            .from('question_responses')
            .select('user_id')
            .eq('friendship_id', friendshipId)
            .eq('question_id', questionId);

          if (data && data.length === 2) {
            onBothSubmitted();
          }
        }
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [friendshipId, questionId, onBothSubmitted]);
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `expo-av` Video component | `expo-video` with `useVideoPlayer` hook | SDK 51 (2024) | Cleaner API, reliable `playToEnd` event; expo-av Video still works but is legacy |
| `Camera` class from expo-camera | `CameraView` from expo-camera | expo-camera 14.x (2024) | `Camera` class removed; must use `CameraView` |
| `Camera.recordAsync()` static method | Instance method via `ref.current.recordAsync()` | expo-camera 14.x | Requires `useRef<CameraView>()` not static class method |
| Blob upload in React Native | ArrayBuffer upload | Persistent issue; documented 2023+ | Blob/FormData silently corrupts; ArrayBuffer is the only reliable path |
| Manual pg_cron via net.http_post | `supabase.modules.cron` or direct `cron.schedule()` | Supabase Cron module (2024) | Dashboard Cron UI available; SQL remains the standard for code-tracked migrations |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `maxDuration: 30` is in seconds, not milliseconds | Pitfall 1 + Pattern 2 | If implementation differs from types, recording never auto-stops; camera would never release |
| A2 | `react-native-compressor` works in Expo managed workflow (it has app.plugin.js) | Standard Stack | If managed workflow isn't fully supported, video compression would fail silently or require bare workflow |
| A3 | pg_cron is available on Supabase free plan | Pattern 10 | If free plan lacks pg_cron, question scheduling won't work until a paid plan is used; fallback = client-triggered rotation |
| A4 | Video compression ratio ~60-80% size reduction | Pattern 3 | If compression is less effective, files could exceed 50MiB Supabase Storage limit; increase limit in config.toml |
| A5 | Supabase Realtime delivers INSERT events within ~1-2 seconds | Pattern 7 | If Realtime is slow or unreliable in development, reveal detection may need polling fallback |
| A6 | `storage.foldername()` segment indexes are 1-based | Pattern 9 (RLS) | If segment indexing differs, the delete policy would fail for all videos; test with actual upload paths |

---

## Open Questions

1. **Question scheduling: when does the 24h window open?**
   - What we know: REQUIREMENTS.md says new question every 24 hours; pg_cron at midnight UTC assigns questions
   - What's unclear: Should questions open simultaneously for all friendships (midnight UTC), or when each user opens the app?
   - Recommendation: Use midnight UTC for MVP simplicity; "when user opens app" requires per-friendship scheduling which is more complex
   - Note: This is an open question in CLAUDE.md: "Should questions surface simultaneously or when each opens the app?"

2. **Reveal notification trigger mechanism**
   - What we know: PUSH-04 requires notification when both friends submit; Expo Push is in Phase 3
   - What's unclear: Phase 2 implements the reveal mechanic but push notifications are Phase 3 — what triggers the reveal in Phase 2 without push?
   - Recommendation: In Phase 2, use Realtime subscription on the reveal screen to detect both-submitted. Push notification is wired in Phase 3 to supplement (user may not have the screen open).

3. **Video storage path — who stores it?**
   - What we know: `question_responses.video_url` exists in schema; storage path convention is `videos/{friendship_id}/{user_id}/{question_id}.mp4`
   - What's unclear: Should `video_url` store the full storage path or just the filename?
   - Recommendation: Store only the relative storage path (e.g., `{friendship_id}/{user_id}/{question_id}.mp4`) — not a signed URL. Generate signed URL on demand.

4. **Re-record flow: should the partially-recorded video be deleted from local storage?**
   - What we know: VIDEO-02 allows re-record before submit; the `recordAsync` URI is a temporary local file
   - What's unclear: React Native's temp file cleanup is unreliable on iOS
   - Recommendation: On re-record, explicitly call `FileSystem.deleteAsync(previousUri, { idempotent: true })` before starting a new recording

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| expo-camera | VIDEO-01, VIDEO-02 | Yes (installed) | 17.0.10 | — |
| expo-av | VIDEO playback | Yes (installed) | 16.0.8 | — (use until expo-video installed) |
| expo-file-system | VIDEO-03 (upload) | Not yet installed | 19.0.21 (npm) | None — required for ArrayBuffer upload |
| expo-video | REVEAL-03 (playback) | Not yet installed | 3.0.16 (npm) | expo-av Video component as fallback |
| react-native-compressor | VIDEO-04 | Not yet installed | 1.16.0 (npm) | Skip compression (risk: large files) |
| base64-arraybuffer | VIDEO-03 (upload) | Not yet installed | 1.0.2 (npm) | None — required for upload |
| Supabase Realtime | REVEAL-01, REVEAL-02 | Yes (configured) | via @supabase/supabase-js | Client polling every 5s as fallback |
| pg_cron extension | LOOP-02 (scheduling) | Assumed available (Supabase managed) | built-in | Manual Edge Function + HTTP trigger |
| Physical device | Video recording tests | [ASSUMED: available] | — | Simulator cannot test Camera |

**Missing dependencies that must be installed before implementation:**
- `expo-file-system` — no upload without it
- `base64-arraybuffer` — no upload without it

**Missing dependencies with fallbacks:**
- `expo-video` — `expo-av` Video component is a workable interim
- `react-native-compressor` — can skip compression initially (large files) and add later

---

## Validation Architecture

nyquist_validation is enabled in config.json.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Jest + React Native Testing Library (jest-expo) |
| Config file | None — needs Wave 0 setup (carried over from Phase 1 Wave 0) |
| Quick run command | `cd /Users/hanswagener/reconnect/mobile && npx jest --testPathPattern=(video\|reveal\|home\|question) --passWithNoTests` |
| Full suite command | `cd /Users/hanswagener/reconnect/mobile && npx jest` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOOP-01 | Friendship has `current_question_id` after rotation | integration (Supabase local) | `supabase db test` | Wave 0 |
| LOOP-02 | `rotate_daily_questions()` assigns new question when both responded | integration (DB function) | `supabase db test` | Wave 0 |
| LOOP-03 | Weighted category selection returns valid question ID | unit | `npx jest --testPathPattern=question` | Wave 0 |
| LOOP-04 | `question_ratings` upsert saves correct rating | integration | `supabase db test` | Wave 0 |
| LOOP-05 | Question selection excludes previously used questions | unit | `npx jest --testPathPattern=question` | Wave 0 |
| VIDEO-01 | `recordAsync({ maxDuration: 30 })` called with correct options | unit (mock camera) | `npx jest --testPathPattern=VideoRecorder` | Wave 0 |
| VIDEO-02 | Re-record replaces previous URI; previous temp file deleted | unit | `npx jest --testPathPattern=VideoRecorder` | Wave 0 |
| VIDEO-03 | `uploadVideo` hook calls createSignedUploadUrl + XHR PUT | unit (mock XHR) | `npx jest --testPathPattern=useVideoUpload` | Wave 0 |
| VIDEO-04 | `VideoCompressor.compress()` called before upload | unit (mock) | `npx jest --testPathPattern=useVideoUpload` | Wave 0 |
| VIDEO-05 | `onProgress` callback fires during upload | unit (mock XHR) | `npx jest --testPathPattern=useVideoUpload` | Wave 0 |
| REVEAL-01 | Friend's video_url not returned in SELECT until both submitted | integration (RLS test) | manual / `supabase db test` | Wave 0 |
| REVEAL-02 | Push notification deferred to Phase 3 | — | N/A | — |
| REVEAL-03 | `createSignedUrl` called with 300s expiry on reveal | unit | `npx jest --testPathPattern=reveal` | Wave 0 |
| REVEAL-04 | `storage.remove()` + `watched_at` update called after `playToEnd` | unit (mock player) | `npx jest --testPathPattern=reveal` | Wave 0 |
| REVEAL-05 | Home screen query sorts: reveal_ready first | unit | `npx jest --testPathPattern=home` | Wave 0 |
| HOME-01 | `fetchFriendshipsWithState` returns correct sort order | unit | `npx jest --testPathPattern=useFriendships` | Wave 0 |
| HOME-02 | FriendshipCard renders friend name, streak, question | unit (RNTL) | `npx jest --testPathPattern=FriendshipCard` | Wave 0 |
| HOME-03 | "Your Turn" card displays time remaining | unit (RNTL) | `npx jest --testPathPattern=FriendshipCard` | Wave 0 |
| HOME-04 | "Reveal Ready" card has distinct visual treatment | unit (RNTL snapshot) | `npx jest --testPathPattern=FriendshipCard` | Wave 0 |

### Sampling Rate
- **Per task commit:** `cd /Users/hanswagener/reconnect/mobile && npx jest --testPathPattern=(useVideoUpload|useRevealSubscription|useFriendships|question) --passWithNoTests`
- **Per wave merge:** `cd /Users/hanswagener/reconnect/mobile && npx jest`
- **Phase gate:** Full jest suite green before `/gsd-verify-work`

### Wave 0 Gaps
- [ ] `mobile/jest.config.js` — already needed from Phase 1; ensure installed
- [ ] `mobile/__tests__/useVideoUpload.test.ts` — covers VIDEO-03, VIDEO-04, VIDEO-05
- [ ] `mobile/__tests__/VideoRecorder.test.tsx` — covers VIDEO-01, VIDEO-02
- [ ] `mobile/__tests__/reveal.test.tsx` — covers REVEAL-03, REVEAL-04
- [ ] `mobile/__tests__/useFriendships.test.ts` — covers HOME-01, REVEAL-05
- [ ] `mobile/__tests__/FriendshipCard.test.tsx` — covers HOME-02, HOME-03, HOME-04
- [ ] `mobile/__tests__/question.test.ts` — covers LOOP-03, LOOP-05
- [ ] Framework install: `cd mobile && npx expo install expo-file-system expo-video && npm install react-native-compressor base64-arraybuffer`

---

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (covered in Phase 1) | Supabase Auth JWT |
| V3 Session Management | No (covered in Phase 1) | AsyncStorage + token rotation |
| V4 Access Control | Yes | RLS on `question_responses`, `videos` storage; friend-only access patterns |
| V5 Input Validation | Yes | `maxDuration: 30` enforced server-side by Expo camera; video path validation before upload |
| V6 Cryptography | No | Signed URLs use Supabase's built-in crypto; no hand-rolled crypto |

### Known Threat Patterns for This Stack

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| User submits response for a friendship they're not in | Elevation of Privilege | `question_responses` INSERT policy: `with check (auth.uid() = user_id)` + existing SELECT policy verifies friendship membership |
| User accesses friend's video before both submitted | Information Disclosure | REVEAL-01: RLS policy blocks SELECT of other user's response until both submitted (needs explicit policy revision — see Pattern 9) |
| Storage path traversal (guessing other users' video paths) | Information Disclosure | Videos bucket is private; all access via signed URLs which require server-side generation; RLS on `storage.objects` enforces auth |
| Replay attack on signed upload URL | Tampering | Signed upload URLs expire in 2 hours [VERIFIED: createSignedUploadUrl docs]; single-use enforced server-side |
| Video stored permanently despite "ephemeral" promise | Repudiation | Client calls `storage.remove()` + sets `watched_at`; add DB trigger as backup to flag for scheduled cleanup |
| Oversized video upload (>50MiB) | DoS | Supabase Storage config limit 50MiB [VERIFIED: INTEGRATIONS.md]; 30s compressed video ~5-15MB, well within limit |

**REVEAL-01 RLS gap to fix in Phase 2 migration:**

The current `question_responses` policy is `for all using (exists (select 1 from friendships...))`. This lets a friendship member read ALL responses for the friendship — including the friend's response before both have submitted. Phase 2 must add a more restrictive SELECT policy:

```sql
-- In Phase 2 migration: replace "for all" policy with specific policies
-- Remove the broad "for all" policy first
drop policy if exists "Only friendship members can access responses" on public.question_responses;

-- SELECT: user sees own response always; sees friend's response only after both submitted
create policy "Users can read responses after both submitted"
  on public.question_responses for select
  using (
    auth.uid() = user_id  -- always see own response
    or (
      -- see friend's response only if BOTH have submitted
      exists (
        select 1 from public.question_responses r2
        where r2.friendship_id = question_responses.friendship_id
          and r2.question_id = question_responses.question_id
          and r2.user_id = auth.uid()
      )
      and exists (
        select 1 from public.friendships f
        where f.id = question_responses.friendship_id
          and (f.user_a = auth.uid() or f.user_b = auth.uid())
      )
    )
  );
```

---

## Sources

### Primary (HIGH confidence)
- Reading `/Users/hanswagener/reconnect/mobile/node_modules/expo-camera/src/Camera.types.ts` — `CameraRecordingOptions.maxDuration` type (`number`, comment "in seconds"), `CameraViewProps`, `CameraViewRef` interface
- Reading `/Users/hanswagener/reconnect/mobile/node_modules/expo-camera/src/CameraView.tsx` — `recordAsync`, `stopRecording`, `defaultProps` (mode defaults to 'picture')
- Reading `/Users/hanswagener/reconnect/mobile/node_modules/expo-camera/src/index.ts` — `useCameraPermissions`, `useMicrophonePermissions` exports
- Reading `/Users/hanswagener/reconnect/mobile/node_modules/@supabase/storage-js/src/packages/StorageFileApi.ts` — `upload`, `uploadToSignedUrl`, `createSignedUploadUrl`, `createSignedUrl`, `remove` signatures
- Reading `/Users/hanswagener/reconnect/mobile/node_modules/@supabase/realtime-js/src/RealtimeChannel.ts` — `postgres_changes` filter syntax, `.on()` + `.subscribe()` ordering requirement
- GitHub expo/expo sdk-54 branch: `VideoPlayerEvents.types.ts` — `playToEnd`, `statusChange`, `timeUpdate` events
- GitHub expo/expo sdk-54 branch: `VideoPlayer.tsx` — `useVideoPlayer(source, setup?)` hook signature
- GitHub expo/expo sdk-54 branch: `bundledNativeModules.json` — expo-video `~3.0.16` for SDK 54

### Secondary (MEDIUM confidence)
- [Supabase React Native Storage blog](https://supabase.com/blog/react-native-storage) — ArrayBuffer upload requirement confirmed
- [Supabase Realtime Postgres Changes docs](https://supabase.com/docs/guides/realtime/postgres-changes) — filter syntax, DELETE limitation, RLS behavior
- [Supabase pg_cron docs](https://supabase.com/docs/guides/database/extensions/pg_cron) — `cron.schedule()` syntax
- [Supabase Schedule Functions docs](https://supabase.com/docs/guides/functions/schedule-functions) — pg_cron + pg_net pattern
- npm registry: expo-video@3.0.16, expo-file-system@19.0.21, base64-arraybuffer@1.0.2, react-native-compressor@1.16.0

### Tertiary (LOW confidence — flagged as ASSUMED)
- pg_cron availability on Supabase free plan — A3
- Video compression ratio (~60-80%) — A4
- Realtime delivery latency of ~1-2s — A5

---

## Metadata

**Confidence breakdown:**
- expo-camera recording API: HIGH — verified from installed node_modules source
- Supabase Storage upload (ArrayBuffer pattern): HIGH — verified from installed storage-js source + official blog
- Supabase Realtime postgres_changes: HIGH — verified from installed realtime-js source + official docs
- expo-video API: HIGH — verified from GitHub sdk-54 branch source
- pg_cron scheduling: MEDIUM — SQL syntax verified; free plan availability ASSUMED
- Video compression (react-native-compressor): MEDIUM — package has Expo plugin; actual compression ratio ASSUMED
- RLS for reveal (REVEAL-01): HIGH — gap identified from reading current schema; fix pattern derived from schema

**Research date:** 2026-04-05
**Valid until:** 2026-05-05 (Supabase Realtime API is stable; expo-camera 17.x is locked to SDK 54; expo-video 3.x may receive patch updates)
