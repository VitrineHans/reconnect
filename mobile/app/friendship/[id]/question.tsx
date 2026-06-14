import { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuestion } from '../../../hooks/useQuestion';
import { colors, typography, spacing } from '../../../theme/tokens';
import { scheduleStreakRiskNotification, cancelStreakRiskNotification } from '../../../hooks/useNotifications';
import { supabase } from '../../../lib/supabase';

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { question, loading, error } = useQuestion(id ?? null);

  const notifIdRef = useRef<string | null>(null);
  const questionId = question?.id ?? null;

  useEffect(() => {
    if (!id || !questionId) return;

    let cancelled = false;

    async function scheduleIfNeeded() {
      const { data: responses } = await supabase
        .from('question_responses')
        .select('expires_at, user_id')
        .eq('friendship_id', id)
        .eq('question_id', questionId)
        .limit(1);

      if (cancelled) return;
      if (!responses || responses.length === 0) return;

      const expiresAt = responses[0].expires_at;
      if (!expiresAt) return;

      const { data: friendship } = await supabase
        .from('friendships')
        .select('user_a, user_b')
        .eq('id', id)
        .single();

      if (cancelled || !friendship) return;
      const notifId = await scheduleStreakRiskNotification(expiresAt);
      if (!cancelled) notifIdRef.current = notifId;
    }

    scheduleIfNeeded();
    return () => {
      cancelled = true;
      cancelStreakRiskNotification(notifIdRef.current);
    };
  }, [id, questionId]);

  useEffect(() => {
    if (!loading && question) {
      router.replace(`/friendship/${id}/record?questionId=${question.id}`);
    } else if (!loading && !question && id) {
      // No question assigned yet — trigger rotation then re-fetch
      supabase.rpc('rotate_daily_questions').then(() =>
        supabase
          .from('friendships')
          .select('current_question_id')
          .eq('id', id)
          .single()
          .then(({ data }) => {
            if (data?.current_question_id) {
              router.replace(`/friendship/${id}/record?questionId=${data.current_question_id}`);
            }
          })
      );
    }
  }, [loading, question]);

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !question) {
    console.log('[question] id:', id, 'error:', error, 'question:', question);
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error ?? t('flow.noQuestionYet')}</Text>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
    padding: spacing[6],
  },
  errorText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
