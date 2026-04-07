import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
import { Audio, Video, ResizeMode } from 'expo-av';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing } from '../theme/tokens';

interface VideoPlayerProps {
  signedUrl: string;
  storagePath: string;
  friendshipId: string;
  questionId: string;
  onWatched: () => void;
}

async function completeReveal(
  storagePath: string,
  friendshipId: string,
  questionId: string,
): Promise<void> {
  await supabase
    .from('question_responses')
    .update({ watched_at: new Date().toISOString() })
    .eq('friendship_id', friendshipId)
    .eq('question_id', questionId)
    .eq('video_url', storagePath);

  const { data: responses } = await supabase
    .from('question_responses')
    .select('id, video_url, watched_at')
    .eq('friendship_id', friendshipId)
    .eq('question_id', questionId);

  const bothWatched = responses?.length === 2 && responses.every((r) => r.watched_at !== null);
  if (!bothWatched) return;

  const paths = responses!.map((r) => r.video_url);
  await supabase.storage.from('videos').remove(paths);
  await supabase.from('question_responses').delete()
    .eq('friendship_id', friendshipId).eq('question_id', questionId);
  await supabase.from('friendships').update({ current_question_id: null }).eq('id', friendshipId);
  await supabase.rpc('rotate_daily_questions');
}

function WatchedOverlay() {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator color={colors.ember} />
    </View>
  );
}

// ── Web player ──────────────────────────────────────────────────────────────
// Uses a raw <div> + <video> via dangerouslySetInnerHTML workaround to bypass
// React Native Web's event abstraction layer. We inject the HTML directly so
// the browser treats the click as a real user gesture enabling unmuted play.

function WebVideoPlayer({ signedUrl, storagePath, friendshipId, questionId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [done, setDone] = useState(false);
  const [unmuted, setUnmuted] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create video element manually so we get a real DOM reference
    const video = document.createElement('video');
    video.src = signedUrl;
    video.autoplay = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.style.cssText = 'width:100%;height:100%;object-fit:contain;background:#000;display:block;';
    container.appendChild(video);
    videoRef.current = video;

    video.addEventListener('ended', () => {
      if (hasWatchedRef.current) return;
      hasWatchedRef.current = true;
      setDone(true);
      completeReveal(storagePath, friendshipId, questionId).catch(() => {}).finally(() => onWatched());
    });

    return () => {
      video.pause();
      video.remove();
      videoRef.current = null;
    };
  }, [signedUrl]);

  function handleUnmute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    v.play();
    setUnmuted(true);
  }

  if (done) return <WatchedOverlay />;

  return (
    // @ts-ignore — div is valid on web
    <div style={{ flex: 1, position: 'relative', backgroundColor: '#000', width: '100%', height: '100%' }}>
      {/* @ts-ignore */}
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {!unmuted && (
        // @ts-ignore
        <div
          onClick={handleUnmute}
          style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.5)',
            cursor: 'pointer',
          }}
        >
          {/* @ts-ignore */}
          <div style={{
            width: 72, height: 72, borderRadius: 36,
            backgroundColor: colors.ember,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            {/* @ts-ignore */}
            <span style={{ fontSize: 28 }}>🔇</span>
          </div>
          {/* @ts-ignore */}
          <span style={{ color: '#fff', fontSize: 16 }}>Tap to unmute</span>
        </div>
      )}
    </div>
  );
}

// ── Native player ───────────────────────────────────────────────────────────
// Uses expo-av's Video component + Audio.setAudioModeAsync so that
// playsInSilentModeIOS works. expo-video's useVideoPlayer has its own
// AVAudioSession management that conflicts with the Audio API.

function NativeVideoPlayer({ signedUrl, storagePath, friendshipId, questionId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);
  const [done, setDone] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
      staysActiveInBackground: false,
      shouldDuckAndroid: false,
    }).catch(() => {});
  }, []);

  function handlePlaybackStatusUpdate(status: any) {
    if (status.isLoaded && status.didJustFinish && !hasWatchedRef.current) {
      hasWatchedRef.current = true;
      setDone(true);
      completeReveal(storagePath, friendshipId, questionId).catch(() => {}).finally(() => onWatched());
    }
    if (status.error) {
      setPlayError(status.error ?? 'Could not play video.');
    }
  }

  if (done) return <WatchedOverlay />;
  if (playError) return <View style={styles.overlay}><Text style={styles.errorText}>{playError}</Text></View>;

  return (
    <View style={styles.container}>
      <Video
        source={{ uri: signedUrl }}
        style={styles.video}
        resizeMode={ResizeMode.CONTAIN}
        shouldPlay
        isLooping={false}
        useNativeControls={false}
        onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
      />
    </View>
  );
}

export function VideoPlayer(props: VideoPlayerProps) {
  if (Platform.OS === 'web') return <WebVideoPlayer {...props} />;
  return <NativeVideoPlayer {...props} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  overlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  errorText: { color: colors.flame, fontSize: typography.sizes.base, fontFamily: typography.families.body, textAlign: 'center' },
});
