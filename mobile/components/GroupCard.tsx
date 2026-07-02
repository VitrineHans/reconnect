import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupWithState, GroupState } from '../hooks/useGroups';
import { AvatarStack } from './Avatar';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';

export interface GroupCardProps {
  group: GroupWithState;
  onPress: (id: string) => void;
}

const STATE_META: Record<GroupState, { ctaKey: string; border: string; pill: string; pillText: string }> = {
  reveal_ready: { ctaKey: 'group.cta.watch', border: colors.stateRevealReady, pill: colors.gold, pillText: '#0D0B09' },
  your_turn:    { ctaKey: 'group.cta.record', border: colors.stateYourTurn, pill: colors.ember, pillText: '#FFFFFF' },
  waiting:      { ctaKey: 'group.cta.waiting', border: colors.stateWaiting, pill: 'transparent', pillText: colors.textMuted },
};

/**
 * A group in the Home feed. Lives in the SAME feed as friendship cards —
 * distinguished subtly by the member facepile and the group badge, not by a
 * separate section.
 */
export const GroupCard = memo(function GroupCard({ group, onPress }: GroupCardProps) {
  const { t } = useTranslation();
  const meta = STATE_META[group.state];
  const isWaiting = group.state === 'waiting';

  const stackMembers = group.members.map((m) => ({
    id: m.id,
    name: m.display_name ?? m.username,
    url: m.avatar_url,
  }));

  return (
    <Pressable
      testID={`group-card-${group.id}`}
      onPress={() => onPress(group.id)}
      accessibilityRole="button"
      accessibilityLabel={group.name}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.99 : 1 }] })}
    >
      <View
        style={[
          styles.card,
          { borderColor: meta.border },
          isWaiting ? shadows.medium
          : group.state === 'reveal_ready' ? shadows.goldGlow
          : shadows.emberGlow,
        ]}
      >
        <View style={styles.header}>
          <View style={styles.avatarWrap}>
            <AvatarStack members={stackMembers} size={34} max={3} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.name} numberOfLines={1}>{group.name}</Text>
            <Text style={styles.members}>{t('group.members', { count: group.members.length })}</Text>
          </View>
          <View style={styles.groupBadge}>
            <Text style={styles.groupBadgeText}>👥</Text>
          </View>
        </View>

        {/* Question — always the full text, never truncated */}
        {group.questionText != null && (
          <Text style={styles.question}>{group.questionText}</Text>
        )}

        <View style={[styles.cta, { backgroundColor: meta.pill }]}>
          <Text style={[styles.ctaText, { color: meta.pillText }, isWaiting && styles.ctaWaiting]}>
            {t(meta.ctaKey)}
          </Text>
        </View>
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  avatarWrap: { marginRight: spacing[3] },
  headerText: { flex: 1, gap: 3 },
  name: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontFamily: typography.families.bodyBold,
    letterSpacing: typography.letterSpacing.tight,
  },
  members: {
    color: colors.textMuted,
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodyMedium,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  groupBadge: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.stroke,
  },
  groupBadgeText: {
    fontSize: typography.sizes.sm,
  },
  question: {
    color: colors.text,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyMedium,
    lineHeight: typography.sizes.base * typography.lineHeights.relaxed,
    marginBottom: spacing[3],
  },
  cta: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  ctaText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
    letterSpacing: typography.letterSpacing.wide,
  },
  ctaWaiting: { fontFamily: typography.families.body },
});
