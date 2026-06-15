import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useVideoPlayer, VideoView } from 'expo-video';
import { supabase } from '../../../lib/supabase';
import { colors, typography, spacing, radius } from '../../../theme/tokens';

async function fetchMemberVideoUrl(groupId: string, memberId: string): Promise<string> {
  const { data: group } = await supabase
    .from('groups').select('current_question_id').eq('id', groupId).single();
  const questionId = (group as { current_question_id: string | null } | null)?.current_question_id;
  if (!questionId) throw new Error('no question');

  // RLS only returns this row if the viewer has already answered (answer-to-unlock).
  const { data: resp } = await supabase
    .from('question_responses')
    .select('video_url')
    .eq('group_id', groupId)
    .eq('question_id', questionId)
    .eq('user_id', memberId)
    .single();
  const path = (resp as { video_url: string } | null)?.video_url;
  if (!path) throw new Error('no response');

  const { data: urlData, error } = await supabase.storage.from('videos').createSignedUrl(path, 300);
  if (error || !urlData?.signedUrl) throw new Error('no url');
  return urlData.signedUrl;
}

/** Inner player — mounted only once we have a URL (useVideoPlayer needs one). */
function Player({ signedUrl }: { signedUrl: string }) {
  const player = useVideoPlayer(signedUrl, (p) => p.play());
  return <VideoView style={styles.video} player={player} allowsFullscreen contentFit="contain" />;
}

export default function GroupWatchScreen() {
  const { id, member } = useLocalSearchParams<{ id: string; member: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!id || !member) return;
    fetchMemberVideoUrl(id, member).then(setSignedUrl).catch(() => setError(true));
  }, [id, member]);

  return (
    <View style={styles.screen}>
      <TouchableOpacity style={styles.close} onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
      {error ? (
        <Text style={styles.message}>{t('flow.videoUrlFailed')}</Text>
      ) : signedUrl ? (
        <Player signedUrl={signedUrl} />
      ) : (
        <ActivityIndicator color={colors.ember} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  video: { width: '100%', height: '100%' },
  close: {
    position: 'absolute', top: spacing[12], right: spacing[5], zIndex: 10,
    width: 40, height: 40, borderRadius: radius.full, backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: typography.sizes.lg, fontWeight: '600' },
  message: { color: colors.textSecondary, fontSize: typography.sizes.base, fontFamily: typography.families.body, padding: spacing[6], textAlign: 'center' },
});
