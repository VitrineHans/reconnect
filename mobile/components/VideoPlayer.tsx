import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text } from 'react-native';
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

export function VideoPlayer({ signedUrl, storagePath, friendshipId, questionId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);
  const [done, setDone] = useState(false);
  const [playError, setPlayError] = useState<string | null>(null);

  const player = useVideoPlayer(signedUrl, (p) => {
    p.play();
  });

  useEffect(() => {
    const endSub = player.addListener('playToEnd', () => {
      if (hasWatchedRef.current) return;
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

  if (done) {
    return (
      <View style={styles.overlay}>
        <ActivityIndicator color={colors.ember} />
      </View>
    );
  }

  if (playError) {
    return (
      <View style={styles.overlay}>
        <Text style={styles.errorText}>{playError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView player={player} style={styles.video} nativeControls contentFit="contain" />
      {/* Transparent overlay absorbs all touches — hides native controls */}
      <View style={StyleSheet.absoluteFillObject} onStartShouldSetResponder={() => true} />
    </View>
  );
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
  errorText: {
    color: colors.flame,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    textAlign: 'center',
  },
});
