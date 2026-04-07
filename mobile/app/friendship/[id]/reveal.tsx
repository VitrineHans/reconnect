import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { VideoPlayer } from '../../../components/VideoPlayer';
import { useSession } from '../../../hooks/useSession';
import { colors, typography, spacing } from '../../../theme/tokens';

interface RevealResponse {
  id: string;
  video_url: string;
  question_id: string;
}

interface RevealState {
  response: RevealResponse | null;
  signedUrl: string | null;
  loading: boolean;
  error: string | null;
}

async function fetchRevealData(
  friendshipId: string,
  userId: string,
): Promise<{ response: RevealResponse; signedUrl: string }> {
  const { data: friendship, error: fErr } = await supabase
    .from('friendships')
    .select('current_question_id')
    .eq('id', friendshipId)
    .single();

  if (fErr || !friendship?.current_question_id) {
    throw new Error('Could not load friendship question');
  }

  const { data: response, error: rErr } = await supabase
    .from('question_responses')
    .select('id, video_url, question_id')
    .eq('friendship_id', friendshipId)
    .neq('user_id', userId)
    .eq('question_id', friendship.current_question_id)
    .single();

  if (rErr || !response) {
    throw new Error("Friend's response not found");
  }

  const { data: urlData, error: urlErr } = await supabase.storage
    .from('videos')
    .createSignedUrl(response.video_url, 300);

  if (urlErr || !urlData?.signedUrl) {
    throw new Error('Could not generate video URL');
  }

  return {
    response: { id: response.id, video_url: response.video_url, question_id: response.question_id },
    signedUrl: urlData.signedUrl,
  };
}

export default function RevealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const router = useRouter();

  const [state, setState] = useState<RevealState>({
    response: null,
    signedUrl: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const userId = session?.user?.id;
    if (!userId || !id) return;

    fetchRevealData(id, userId)
      .then(({ response, signedUrl }) => {
        setState({ response, signedUrl, loading: false, error: null });
      })
      .catch((err: Error) => {
        setState((prev) => ({ ...prev, loading: false, error: err.message }));
      });
  }, [id, session?.user?.id]);

  if (state.loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.gold} />
        <Text style={styles.loadingText}>Getting their answer...</Text>
      </View>
    );
  }

  if (state.error || !state.signedUrl || !state.response) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{state.error ?? 'Something went wrong'}</Text>
      </View>
    );
  }

  return (
    <VideoPlayer
      signedUrl={state.signedUrl}
      storagePath={state.response.video_url}
      friendshipId={id}
      questionId={state.response.question_id}
      onWatched={() => router.replace('/(tabs)/home')}
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
    gap: spacing[3],
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
  },
  errorText: {
    color: colors.flame,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    textAlign: 'center',
    padding: spacing[6],
  },
});
