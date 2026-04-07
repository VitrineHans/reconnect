import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Platform } from 'react-native';
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
  await supabase.storage.from('videos').remove([storagePath]);

  await supabase
    .from('question_responses')
    .delete()
    .eq('friendship_id', friendshipId)
    .eq('question_id', questionId);

  const { data: friendship } = await supabase
    .from('friendships')
    .select('streak_count')
    .eq('id', friendshipId)
    .single();

  await supabase
    .from('friendships')
    .update({
      streak_count: (friendship?.streak_count ?? 0) + 1,
      current_question_id: null,
    })
    .eq('id', friendshipId);
}

function WatchedOverlay() {
  return (
    <View style={styles.overlay}>
      <ActivityIndicator color={colors.ember} />
    </View>
  );
}

function WebVideoPlayer({ signedUrl, storagePath, friendshipId, questionId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);
  const [done, setDone] = useState(false);

  function handleEnded() {
    if (hasWatchedRef.current) return;
    hasWatchedRef.current = true;
    setDone(true);
    completeReveal(storagePath, friendshipId, questionId)
      .catch(() => {})
      .finally(() => onWatched());
  }

  if (done) return <WatchedOverlay />;

  return (
    <View style={styles.container}>
      {/* @ts-ignore — <video> is valid JSX on web */}
      <video
        src={signedUrl}
        autoPlay
        controls={false}
        playsInline
        onEnded={handleEnded}
        style={{ width: '100%', height: '100%', objectFit: 'contain', backgroundColor: '#000' }}
      />
    </View>
  );
}

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
      if (player.currentTime < 1) return;
      hasWatchedRef.current = true;
      setDone(true);
      completeReveal(storagePath, friendshipId, questionId)
        .catch(() => {})
        .finally(() => onWatched());
    });

    const statusSub = player.addListener('statusChange', ({ status, error }) => {
      if (status === 'error') {
        setPlayError(error?.message ?? 'Could not play video — format may not be supported on this device.');
      }
    });

    return () => {
      endSub.remove();
      statusSub.remove();
    };
  }, [player, storagePath, friendshipId, questionId, onWatched]);

  if (done) return <WatchedOverlay />;

  if (playError) {
    return (
      <View style={styles.overlay}>
        <Text style={styles.errorText}>{playError}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <VideoView
        player={player}
        style={styles.video}
        nativeControls
        contentFit="contain"
      />
    </View>
  );
}

export function VideoPlayer(props: VideoPlayerProps) {
  if (Platform.OS === 'web') {
    return <WebVideoPlayer {...props} />;
  }
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
  errorText: {
    color: colors.flame,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    textAlign: 'center',
  },
});
