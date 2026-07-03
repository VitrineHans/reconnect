import { useCallback, useMemo } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet, ScrollView, Share } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../hooks/useSession';
import { useProfile } from '../../hooks/useProfile';
import { useStats } from '../../hooks/useStats';
import { levelForAnswers, achievementsFor, type ProfileStats } from '../../lib/stats';
import { Avatar } from '../../components/Avatar';
import { colors, typography, spacing, radius, shadows } from '../../theme/tokens';

// ── Sections ────────────────────────────────────────────────────────────────

function StreakHero({ stats }: { stats: ProfileStats }) {
  const { t } = useTranslation();

  if (stats.currentStreak === 0 && stats.longestStreak === 0) {
    return (
      <View style={[styles.heroCard, shadows.medium]}>
        <Text style={styles.heroEmoji}>🔥</Text>
        <Text style={styles.heroEmptyTitle}>{t('profile.streakEmptyTitle')}</Text>
        <Text style={styles.heroEmptyBody}>{t('profile.streakEmptyBody')}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.heroCard, shadows.goldGlow]}>
      <Text style={styles.heroEmoji}>🔥</Text>
      <Text style={styles.heroCount}>{stats.currentStreak}</Text>
      <Text style={styles.heroLabel}>{t('profile.dayStreak')}</Text>
      <Text style={styles.heroSub}>{t('profile.longestStreak', { days: stats.longestStreak })}</Text>
    </View>
  );
}

function StatTile({ emoji, value, label }: { emoji: string; value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statEmoji}>{emoji}</Text>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function StatsGrid({ stats }: { stats: ProfileStats }) {
  const { t, i18n } = useTranslation();
  const memberSince = stats.memberSince
    ? new Date(stats.memberSince).toLocaleDateString(i18n.language, { month: 'short', year: 'numeric' })
    : '—';

  return (
    <View>
      <Text style={styles.sectionTitle}>{t('profile.statsTitle')}</Text>
      <View style={styles.statsGrid}>
        <StatTile emoji="🎥" value={String(stats.totalAnswers)} label={t('profile.statAnswers')} />
        <StatTile emoji="👯" value={String(stats.friendsCount)} label={t('profile.statFriends')} />
        <StatTile emoji="👥" value={String(stats.groupsCount)} label={t('profile.statGroups')} />
        <StatTile emoji="📅" value={memberSince} label={t('profile.statMemberSince')} />
      </View>
    </View>
  );
}

function LevelCard({ stats }: { stats: ProfileStats }) {
  const { t } = useTranslation();
  const info = useMemo(() => levelForAnswers(stats.totalAnswers), [stats.totalAnswers]);

  return (
    <View style={[styles.levelCard, shadows.medium]}>
      <View style={styles.levelHeader}>
        <Text style={styles.levelTitle}>{t('profile.levelTitle', { level: info.level })}</Text>
        <Text style={styles.levelXp}>{t('profile.levelProgress', { xp: info.xp, next: info.nextAt })}</Text>
      </View>
      <View style={styles.levelTrack} accessibilityRole="progressbar">
        <View style={[styles.levelFill, { width: `${Math.round(info.progress * 100)}%` }]} />
      </View>
    </View>
  );
}

function Achievements({ stats }: { stats: ProfileStats }) {
  const { t } = useTranslation();
  const achievements = useMemo(() => achievementsFor(stats), [stats]);

  return (
    <View>
      <Text style={styles.sectionTitle}>{t('profile.achievementsTitle')}</Text>
      <View style={styles.badgeGrid}>
        {achievements.map((a) => (
          <View
            key={a.id}
            style={[styles.badge, !a.unlocked && styles.badgeLocked]}
            accessibilityLabel={`${t(a.nameKey)} — ${a.unlocked ? t('profile.unlocked') : t('profile.locked')}`}
          >
            <Text style={[styles.badgeEmoji, !a.unlocked && styles.badgeEmojiLocked]}>
              {a.unlocked ? a.emoji : '🔒'}
            </Text>
            <Text style={[styles.badgeName, !a.unlocked && styles.badgeNameLocked]} numberOfLines={1}>
              {t(a.nameKey)}
            </Text>
            <Text style={styles.badgeDesc} numberOfLines={2}>
              {t(a.descKey)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ── Screen ──────────────────────────────────────────────────────────────────

export default function ProfileScreen() {
  const { session } = useSession();
  const { profile, profileLoading } = useProfile(session);
  const userId = session?.user?.id ?? null;
  const { stats, loading: statsLoading, error: statsError, refetch } = useStats(userId);
  const router = useRouter();
  const { t } = useTranslation();

  const displayName = profile?.display_name || profile?.username || '';

  const invite = useCallback(() => {
    void Share.share({
      message: t('profile.inviteMessage', { username: profile?.username ?? '' }),
    }).catch(() => { /* user dismissed the sheet */ });
  }, [t, profile?.username]);

  if (profileLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.ember} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.container}>
      {/* Identity — display only; editing lives in Settings */}
      <View style={styles.headerRow}>
        <View style={styles.headerSpacer} />
        <TouchableOpacity
          onPress={() => router.push('/settings')}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={t('profile.openSettings')}
          testID="settings-button"
        >
          <Text style={styles.gear}>⚙️</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.identity}>
        <Avatar name={displayName || '?'} url={profile?.avatar_url} size={88} />
        <Text style={styles.displayName}>{displayName}</Text>
        <Text style={styles.username}>@{profile?.username}</Text>
      </View>

      {/* Engagement — every number is real, persisted data */}
      {statsLoading && <ActivityIndicator color={colors.ember} style={styles.statsSpinner} />}
      {!statsLoading && statsError != null && (
        <TouchableOpacity onPress={refetch} accessibilityRole="button">
          <Text style={styles.errorText}>{t('profile.statsError')} — {t('flow.tryAgain')}</Text>
        </TouchableOpacity>
      )}
      {!statsLoading && stats != null && (
        <>
          <StreakHero stats={stats} />
          <StatsGrid stats={stats} />
          <LevelCard stats={stats} />
          <Achievements stats={stats} />

          {/* Soft viral loop */}
          <View style={[styles.inviteCard, shadows.medium]}>
            <Text style={styles.inviteTitle}>{t('profile.inviteTitle')}</Text>
            <Text style={styles.inviteBody}>{t('profile.inviteBody')}</Text>
            <TouchableOpacity style={styles.inviteBtn} onPress={invite} accessibilityRole="button">
              <Text style={styles.inviteBtnText}>{t('profile.inviteCta')}</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </ScrollView>
  );
}

// ── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  screen: { backgroundColor: colors.bg },
  container: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing[12],
  },
  headerSpacer: { width: 24 },
  gear: { fontSize: 22 },

  identity: {
    alignItems: 'center',
    marginBottom: spacing[6],
  },
  displayName: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.families.display,
    color: colors.text,
    marginTop: spacing[3],
  },
  username: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
    marginTop: 2,
  },

  statsSpinner: { marginTop: spacing[6] },
  errorText: {
    color: colors.flame,
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    textAlign: 'center',
    marginTop: spacing[4],
  },

  // Streak hero
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.gold,
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[5],
    marginBottom: spacing[6],
  },
  heroEmoji: { fontSize: 34 },
  heroCount: {
    fontSize: typography.sizes['4xl'],
    fontFamily: typography.families.display,
    color: colors.text,
    lineHeight: typography.sizes['4xl'] * 1.1,
    marginTop: spacing[1],
  },
  heroLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
    color: colors.textSecondary,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  heroSub: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    color: colors.textMuted,
    marginTop: spacing[2],
  },
  heroEmptyTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.families.display,
    color: colors.text,
    marginTop: spacing[2],
    textAlign: 'center',
  },
  heroEmptyBody: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
    marginTop: spacing[1],
    textAlign: 'center',
  },

  // Stats grid
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
    color: colors.textSecondary,
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  statTile: {
    flexBasis: '47%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[4],
    alignItems: 'center',
  },
  statEmoji: { fontSize: 20, marginBottom: spacing[1] },
  statValue: {
    fontSize: typography.sizes.lg,
    fontFamily: typography.families.display,
    color: colors.text,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodyMedium,
    color: colors.textMuted,
    marginTop: 2,
    textAlign: 'center',
  },

  // Level
  levelCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  levelTitle: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyBold,
    color: colors.text,
  },
  levelXp: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodyMedium,
    color: colors.textMuted,
  },
  levelTrack: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surface3,
    overflow: 'hidden',
  },
  levelFill: {
    height: '100%',
    borderRadius: radius.full,
    backgroundColor: colors.yellow,
  },

  // Achievements
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  badge: {
    flexBasis: '30%',
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.stroke,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[2],
    alignItems: 'center',
  },
  badgeLocked: {
    backgroundColor: colors.surface2,
    opacity: 0.75,
  },
  badgeEmoji: { fontSize: 22, marginBottom: spacing[1] },
  badgeEmojiLocked: { opacity: 0.6 },
  badgeName: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodySemiBold,
    color: colors.text,
    textAlign: 'center',
  },
  badgeNameLocked: { color: colors.textMuted },
  badgeDesc: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 2,
  },

  // Invite
  inviteCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.stroke,
    padding: spacing[5],
    alignItems: 'center',
  },
  inviteTitle: {
    fontSize: typography.sizes.md,
    fontFamily: typography.families.display,
    color: colors.text,
  },
  inviteBody: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing[1],
    marginBottom: spacing[4],
  },
  inviteBtn: {
    backgroundColor: colors.ember,
    borderRadius: radius.full,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    ...shadows.emberGlow,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
  },
});
