import { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../../lib/supabase';
import { VideoPlayer } from '../../../components/VideoPlayer';
import { ReactionPicker } from '../../../components/ReactionPicker';
import { sendReaction, type Reaction } from '../../../hooks/useReactions';
import { useSession } from '../../../hooks/useSession';
import { colors, typography, spacing } from '../../../theme/tokens';
import i18n from '../../../lib/i18n';

interface RevealResponse {
  id: string;
  video_url: string;
  question_id: string;
  user_id: string;
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
    throw new Error(i18n.t('flow.revealLoadFailed'));
  }

  const { data: response, error: rErr } = await supabase
    .from('question_responses')
    .select('id, video_url, question_id, user_id')
    .eq('friendship_id', friendshipId)
    .neq('user_id', userId)
    .eq('question_id', friendship.current_question_id)
    .single();

  if (rErr || !response) {
    throw new Error(i18n.t('flow.responseNotFound'));
  }

  const { data: urlData, error: urlErr } = await supabase.storage
    .from('videos')
    .createSignedUrl(response.video_url, 300);

  if (urlErr || !urlData?.signedUrl) {
    throw new Error(i18n.t('flow.videoUrlFailed'));
  }

  return {
    response: {
      id: response.id,
      video_url: response.video_url,
      question_id: response.question_id,
      user_id: response.user_id,
    },
    signedUrl: urlData.signedUrl,
  };
}

export default function RevealScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();

  const [state, setState] = useState<RevealState>({
    response: null,
    signedUrl: null,
    loading: true,
    error: null,
  });
  const [reacting, setReacting] = useState(false);

  const handleReact = async (reaction: Reaction) => {
    const me = session?.user?.id;
    const resp = state.response;
    if (me && resp && id) {
      try { await sendReaction(id, resp.question_id, me, resp.user_id, reaction); } catch { /* best-effort */ }
    }
    router.replace('/(tabs)/home');
  };

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
        <Text style={styles.loadingText}>{t('flow.gettingAnswer')}</Text>
      </View>
    );
  }

  if (state.error || !state.signedUrl || !state.response) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{state.error ?? t('common.somethingWrong')}</Text>
      </View>
    );
  }

  if (reacting) {
    return (
      <ReactionPicker
        onSend={(reaction) => { void handleReact(reaction); }}
        onSkip={() => router.replace('/(tabs)/home')}
      />
    );
  }

  return (
    <VideoPlayer
      signedUrl={state.signedUrl}
      storagePath={state.response.video_url}
      friendshipId={id}
      questionId={state.response.question_id}
      onWatched={() => setReacting(true)}
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
