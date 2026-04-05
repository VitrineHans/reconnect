import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '../lib/supabase';

interface VideoPlayerProps {
  signedUrl: string;
  storagePath: string;
  responseId: string;
  onWatched: () => void;
}

async function deleteAndMarkWatched(storagePath: string, responseId: string): Promise<void> {
  await supabase.storage.from('videos').remove([storagePath]);
  await supabase
    .from('question_responses')
    .update({ watched_at: new Date().toISOString() })
    .eq('id', responseId);
}

export function VideoPlayer({ signedUrl, storagePath, responseId, onWatched }: VideoPlayerProps) {
  const hasWatchedRef = useRef(false);

  const player = useVideoPlayer(signedUrl, (p) => {
    p.play();
  });

  useEffect(() => {
    const subscription = player.addListener('playToEnd', () => {
      if (hasWatchedRef.current) return;
      hasWatchedRef.current = true;

      deleteAndMarkWatched(storagePath, responseId)
        .catch(() => {})
        .finally(() => onWatched());
    });

    return () => {
      subscription.remove();
    };
  }, [player, storagePath, responseId, onWatched]);

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
});
