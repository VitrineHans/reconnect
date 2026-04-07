import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuestion } from '../../../hooks/useQuestion';
import { colors, typography, spacing } from '../../../theme/tokens';

export default function QuestionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { question, loading, error } = useQuestion(id ?? null);

  useEffect(() => {
    if (!loading && question) {
      router.replace(`/friendship/${id}/record?questionId=${question.id}`);
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
        <Text style={styles.errorText}>{error ?? 'No question available yet. Check back soon!'}</Text>
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
