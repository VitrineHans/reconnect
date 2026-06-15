import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupWithState, GroupState } from '../hooks/useGroups';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';

export interface GroupCardProps {
  group: GroupWithState;
  onPress: (id: string) => void;
}

const STATE_META: Record<GroupState, { ctaKey: string; border: string; pill: string; pillText: string }> = {
  reveal_ready: { ctaKey: 'group.cta.watch', border: colors.stateRevealReady, pill: colors.gold, pillText: '#0D0B09' },
  your_turn:    { ctaKey: 'group.cta.record', border: colors.stateYourTurn, pill: colors.ember, pillText: '#0D0B09' },
  waiting:      { ctaKey: 'group.cta.waiting', border: colors.stateWaiting, pill: 'transparent', pillText: colors.textMuted },
};

function preview(text: string | null): string {
  if (!text) return '';
  return text.length > 80 ? `${text.slice(0, 80)}…` : text;
}

export function GroupCard({ group, onPress }: GroupCardProps) {
  const { t } = useTranslation();
  const meta = STATE_META[group.state];
  const isWaiting = group.state === 'waiting';

  return (
    <Pressable
      testID={`group-card-${group.id}`}
      onPress={() => onPress(group.id)}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
    >
      <View style={[styles.card, { borderColor: meta.border }, isWaiting ? shadows.soft : shadows.emberGlow]}>
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Text style={styles.icon}>👥</Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.members}>{t('group.members', { count: group.members.length })}</Text>
          </View>
        </View>

        {group.questionText != null && (
          <Text style={styles.question} numberOfLines={2}>{preview(group.questionText)}</Text>
        )}

        <View style={[styles.cta, { backgroundColor: meta.pill }]}>
          <Text style={[styles.ctaText, { color: meta.pillText }, isWaiting && styles.ctaWaiting]}>
            {t(meta.ctaKey)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  iconCircle: {
    width: 44, height: 44, borderRadius: radius.full,
    backgroundColor: colors.surface3, alignItems: 'center', justifyContent: 'center',
    marginRight: spacing[3], borderWidth: 1, borderColor: colors.strokeStrong,
  },
  icon: { fontSize: 20 },
  headerText: { flex: 1, gap: 3 },
  name: {
    color: colors.text, fontSize: typography.sizes.md, fontWeight: '600',
    letterSpacing: typography.letterSpacing.tight,
  },
  members: {
    color: colors.textMuted, fontSize: typography.sizes.xs, fontWeight: '500',
    letterSpacing: typography.letterSpacing.wide, textTransform: 'uppercase',
  },
  question: {
    color: colors.textSecondary, fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
    marginBottom: spacing[3], fontStyle: 'italic',
  },
  cta: {
    alignSelf: 'flex-start', borderRadius: radius.full,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
  },
  ctaText: { fontSize: typography.sizes.sm, fontWeight: '700', letterSpacing: typography.letterSpacing.wide },
  ctaWaiting: { fontWeight: '400' },
});
