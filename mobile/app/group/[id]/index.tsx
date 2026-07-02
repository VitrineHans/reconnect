import { useCallback, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../../hooks/useSession';
import { leaveGroup } from '../../../hooks/useGroups';
import { supabase } from '../../../lib/supabase';
import { localizedQuestionText } from '../../../lib/questionText';
import { colors, typography, spacing, radius, shadows } from '../../../theme/tokens';

interface Member { id: string; username: string; display_name: string | null }
interface HubData {
  name: string;
  questionText: string | null;
  currentQuestionId: string | null;
  members: Member[];
  answeredIds: Set<string>;
  iAnswered: boolean;
}

async function loadHub(groupId: string, userId: string): Promise<HubData> {
  const { data: group, error } = await supabase
    .from('groups')
    .select('name, current_question_id, questions!current_question_id ( text )')
    .eq('id', groupId)
    .single();
  if (error || !group) throw new Error(error?.message ?? 'not found');

  const row = group as unknown as {
    name: string;
    current_question_id: string | null;
    questions: { text: string } | null;
  };

  const { data: memberRows } = await supabase
    .from('group_members')
    .select('profiles!user_id ( id, username, display_name )')
    .eq('group_id', groupId);
  const members: Member[] = (memberRows ?? []).map(
    (m) => (m as unknown as { profiles: Member }).profiles,
  );

  const answeredIds = new Set<string>();
  const currentQuestionId = row.current_question_id;
  if (currentQuestionId) {
    const { data: resp } = await supabase
      .from('question_responses')
      .select('user_id')
      .eq('group_id', groupId)
      .eq('question_id', currentQuestionId);
    (resp ?? []).forEach((r) => answeredIds.add((r as { user_id: string }).user_id));
  }

  return {
    name: row.name,
    questionText: row.questions ? localizedQuestionText(row.questions.text) : null,
    currentQuestionId,
    members,
    answeredIds,
    iAnswered: answeredIds.has(userId),
  };
}

export default function GroupHubScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user?.id;
  // Opened from the Home feed: leaving the group belongs in the Vrienden tab's
  // group detail, so the action is suppressed here.
  const canLeave = from !== 'home';

  const [data, setData] = useState<HubData | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!id || !userId) return;
      setLoading(true);
      loadHub(id, userId)
        .then(setData)
        .catch(() => setData(null))
        .finally(() => setLoading(false));
    }, [id, userId]),
  );

  const confirmLeave = () => {
    Alert.alert(t('group.leaveConfirmTitle'), t('group.leaveConfirmBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('group.leave'),
        style: 'destructive',
        onPress: async () => {
          if (!id || !userId) return;
          try { await leaveGroup(id, userId); } catch { /* ignore */ }
          router.replace('/(tabs)/home');
        },
      },
    ]);
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.back}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>{data?.name ?? ''}</Text>
        <View style={styles.backSpacer} />
      </View>

      {loading ? (
        <ActivityIndicator color={colors.ember} style={{ marginTop: spacing[10] }} />
      ) : !data ? (
        <Text style={styles.hint}>{t('group.loadFailed')}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!data.currentQuestionId ? (
            <Text style={styles.hint}>{t('group.waitingQuestion')}</Text>
          ) : (
            <>
              <Text style={styles.question}>{data.questionText}</Text>

              {!data.iAnswered ? (
                <>
                  <TouchableOpacity
                    style={styles.recordBtn}
                    onPress={() => router.push(`/group/${id}/record`)}
                  >
                    <Text style={styles.recordText}>{t('group.recordCta')}</Text>
                  </TouchableOpacity>
                  <Text style={styles.lockHint}>{t('group.lockedHint')}</Text>
                </>
              ) : (
                <View style={styles.memberList}>
                  {data.members.map((m) => {
                    const isMe = m.id === userId;
                    const answered = data.answeredIds.has(m.id);
                    const label = isMe ? t('group.youLabel') : (m.display_name ?? m.username);
                    return (
                      <View key={m.id} style={styles.memberRow}>
                        <Text style={styles.memberName}>{label}</Text>
                        {answered && !isMe ? (
                          <TouchableOpacity
                            style={styles.watchBtn}
                            onPress={() => router.push(`/group/${id}/watch?member=${m.id}`)}
                          >
                            <Text style={styles.watchText}>{t('group.watchCta')}</Text>
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.memberStatus}>
                            {answered ? t('group.answeredTag') : t('group.notAnsweredTag')}
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </>
          )}

          {canLeave && (
            <TouchableOpacity style={styles.leaveBtn} onPress={confirmLeave}>
              <Text style={styles.leaveText}>{t('group.leave')}</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[5], paddingTop: spacing[12], paddingBottom: spacing[4],
  },
  back: { fontSize: 34, lineHeight: 34, color: colors.text, fontFamily: typography.families.body },
  backSpacer: { width: 24 },
  title: { flex: 1, textAlign: 'center', fontSize: typography.sizes.lg, fontFamily: typography.families.display, color: colors.text },
  content: { paddingHorizontal: spacing[5], paddingBottom: spacing[10] },
  hint: { color: colors.textMuted, fontSize: typography.sizes.base, fontFamily: typography.families.body, textAlign: 'center', marginTop: spacing[8] },
  question: {
    color: colors.text, fontSize: typography.sizes.lg, fontFamily: typography.families.display,
    lineHeight: typography.sizes.lg * typography.lineHeights.snug, marginTop: spacing[4], marginBottom: spacing[6],
  },
  recordBtn: {
    backgroundColor: colors.ember, borderRadius: radius.md, paddingVertical: spacing[4],
    alignItems: 'center', ...shadows.emberGlow,
  },
  recordText: { color: '#fff', fontSize: typography.sizes.md, fontFamily: typography.families.bodySemiBold, fontWeight: '600' },
  lockHint: { color: colors.textMuted, fontSize: typography.sizes.sm, fontFamily: typography.families.body, textAlign: 'center', marginTop: spacing[3] },
  memberList: { gap: spacing[2] },
  memberRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: colors.stroke, borderRadius: radius.md,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3], backgroundColor: colors.surface,
  },
  memberName: { fontSize: typography.sizes.base, fontFamily: typography.families.bodyMedium, color: colors.text },
  memberStatus: { fontSize: typography.sizes.sm, fontFamily: typography.families.body, color: colors.textMuted },
  watchBtn: { backgroundColor: colors.gold, borderRadius: radius.full, paddingHorizontal: spacing[4], paddingVertical: spacing[2] },
  watchText: { color: '#0D0B09', fontSize: typography.sizes.sm, fontFamily: typography.families.bodySemiBold, fontWeight: '700' },
  leaveBtn: { marginTop: spacing[10], alignItems: 'center', paddingVertical: spacing[3] },
  leaveText: { color: colors.flame, fontSize: typography.sizes.base, fontFamily: typography.families.bodyMedium },
});
