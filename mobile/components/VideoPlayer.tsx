import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
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
// autoPlay+muted always works — no gesture needed. We show a tap-to-unmute
// overlay. On tap we unmute and restart from the beginning.

function WebVideoPlayer({ signedUrl, storagePath, friendshipId, questionId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [done, setDone] = useState(false);
  const [unmuted, setUnmuted] = useState(false);

  function handleEnded() {
    if (hasWatchedRef.current) return;
    hasWatchedRef.current = true;
    setDone(true);
    completeReveal(storagePath, friendshipId, questionId).catch(() => {}).finally(() => onWatched());
  }

  function handleUnmute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.currentTime = 0;
    v.play().catch(() => {});
    setUnmuted(true);
  }

  if (done) return <WatchedOverlay />;

  return (
    <View style={styles.container}>
      {/* @ts-ignore — <video> is valid JSX on web */}
      <video
        ref={(el: HTMLVideoElement | null) => { videoRef.current = el; }}
        src={signedUrl}
        autoPlay
        muted
        playsInline
        onEnded={handleEnded}
        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000', display: 'block' }}
      />
      {!unmuted && (
        <TouchableOpacity style={styles.tapOverlay} onPress={handleUnmute} activeOpacity={0.85}>
          <View style={styles.muteBtn}>
            <Text style={styles.muteIcon}>🔇</Text>
          </View>
          <Text style={styles.tapHint}>Tap to unmute</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Native player ───────────────────────────────────────────────────────────
// expo-video with nativeControls={true} uses AVAudioSessionCategoryPlayback
// which overrides the silent switch and gives full sound. A transparent View
// on top absorbs all touch events so the user can't see or interact with the
// native controls — they auto-hide since they never receive a tap.

function NativeVideoPlayer({ signedUrl, storagePath, friendshipId, questionId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);
  const [done, setDone] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  const player = useVideoPlayer(signedUrl, (p) => {
    p.play();
  });

  useEffect(() => {
    const endSub = player.addListener('playToEnd', () => {
      if (hasWatchedRef.current) return;
      // Guard against spurious early fires
      if (player.currentTime < 1) return;
      hasWatchedRef.current = true;
      setDone(true);
      completeReveal(storagePath, friendshipId, questionId).catch(() => {}).finally(() => onWatched());
    });
    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error') setPlayError(error?.message ?? 'Could not play video.');
    });
    return () => { endSub.remove(); statusSub.remove(); };
  }, [player, storagePath, friendshipId, questionId, onWatched]);

  if (done) return <WatchedOverlay />;
  if (playError) return <View style={styles.overlay}><Text style={styles.errorText}>{playError}</Text></View>;

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
      {/*
        Transparent overlay that claims the touch responder.
        This prevents taps from reaching the native controls underneath,
        so the controls never appear and the user can't pause or scrub.
      */}
      <View style={StyleSheet.absoluteFillObject} onStartShouldSetResponder={() => true} />
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
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  tapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  muteBtn: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.ember,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  muteIcon: { fontSize: 28 },
  tapHint: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyMedium,
  },
  errorText: {
    color: colors.flame,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    textAlign: 'center',
  },
});
