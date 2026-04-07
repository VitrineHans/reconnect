import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, TouchableOpacity, Platform } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Audio } from 'expo-av';
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

function TapToWatchOverlay({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.tapOverlay} onPress={onPress} activeOpacity={0.85}>
      <View style={styles.playButton}>
        <Text style={styles.playIcon}>▶</Text>
      </View>
      <Text style={styles.tapHint}>Tap to watch</Text>
    </TouchableOpacity>
  );
}

// ── Web player ─────────────────────────────────────────────────────────────
// Use state-controlled autoPlay — rendering <video autoPlay> inside a user
// gesture handler satisfies the browser's autoplay policy reliably.

function WebVideoPlayer({ signedUrl, storagePath, friendshipId, questionId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);

  function handleEnded() {
    if (hasWatchedRef.current) return;
    hasWatchedRef.current = true;
    setDone(true);
    completeReveal(storagePath, friendshipId, questionId).catch(() => {}).finally(() => onWatched());
  }

  if (done) return <WatchedOverlay />;

  return (
    <View style={styles.container}>
      {started ? (
        // @ts-ignore — raw <video> element on web
        <video
          src={signedUrl}
          autoPlay
          playsInline
          onEnded={handleEnded}
          style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
        />
      ) : (
        <TapToWatchOverlay onPress={() => setStarted(true)} />
      )}
    </View>
  );
}

// ── Native player ──────────────────────────────────────────────────────────

function NativeVideoPlayer({ signedUrl, storagePath, friendshipId, questionId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);
  const [done, setDone] = useState(false);
  const [started, setStarted] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  const player = useVideoPlayer(signedUrl, (p) => {
    p.muted = false;
  });

  useEffect(() => {
    const endSub = player.addListener('playToEnd', () => {
      if (hasWatchedRef.current) return;
      hasWatchedRef.current = true;
      setDone(true);
      completeReveal(storagePath, friendshipId, questionId).catch(() => {}).finally(() => onWatched());
    });
    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error') setPlayError(error?.message ?? 'Could not play video.');
    });
    return () => { endSub.remove(); statusSub.remove(); };
  }, [player, storagePath, friendshipId, questionId, onWatched]);

  async function handleTapToPlay() {
    // Set audio session immediately before play() so expo-video can't override it.
    // allowsRecordingIOS:false resets expo-camera's playAndRecord session.
    // playsInSilentModeIOS:true plays audio even when the silent switch is on.
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });
    } catch {}
    setStarted(true);
    player.play();
  }

  if (done) return <WatchedOverlay />;
  if (playError) return <View style={styles.overlay}><Text style={styles.errorText}>{playError}</Text></View>;

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} nativeControls={false} contentFit="contain" />
      {!started && <TapToWatchOverlay onPress={handleTapToPlay} />}
    </View>
  );
}

// ── Export ─────────────────────────────────────────────────────────────────

export function VideoPlayer(props: VideoPlayerProps) {
  if (Platform.OS === 'web') return <WebVideoPlayer {...props} />;
  return <NativeVideoPlayer {...props} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  overlay: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  tapOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000' },
  playButton: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.ember, justifyContent: 'center', alignItems: 'center', marginBottom: spacing[4] },
  playIcon: { color: '#fff', fontSize: 32, marginLeft: 6 },
  tapHint: { color: '#fff', fontSize: typography.sizes.base, fontFamily: typography.families.bodyMedium },
  errorText: { color: colors.flame, fontSize: typography.sizes.base, fontFamily: typography.families.body, textAlign: 'center' },
});
