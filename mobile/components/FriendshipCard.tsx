import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import type { FriendshipWithState, FriendshipState } from '../hooks/useFriendships';
import { colors, radius, shadows, spacing, typography } from '../theme/tokens';

export interface FriendshipCardProps {
  friendship: FriendshipWithState;
  onPress: (id: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getTimeRemaining(expiresAt: string): string {
  const diff = Date.parse(expiresAt) - Date.now();
  if (diff <= 0) return '0h 0m left';
  const hours = Math.floor(diff / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getPreview(questionText: string | null): string {
  if (!questionText) return '';
  return questionText.length > 80 ? `${questionText.slice(0, 80)}…` : questionText;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.avatarText}>{getInitials(name)}</Text>
    </View>
  );
}

function StreakBadge({ count }: { count: number }) {
  return (
    <View style={styles.streakBadge}>
      <Text style={styles.streakCount}>🔥 {count}</Text>
    </View>
  );
}

const STATE_META: Record<FriendshipState, { label: string; labelColor: string }> = {
  reveal_ready: { label: '👀  Reveal ready',      labelColor: colors.gold },
  your_turn:    { label: '⏳  Your turn',          labelColor: colors.ember },
  waiting:      { label: '💤  Waiting for them',   labelColor: colors.textMuted },
};

function StateLabel({ state }: { state: FriendshipState }) {
  const { label, labelColor } = STATE_META[state];
  return <Text style={[styles.stateLabel, { color: labelColor }]}>{label}</Text>;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function FriendshipCard({ friendship, onPress }: FriendshipCardProps) {
  const { id, friendProfile, streakCount, questionText, state, expiresAt } = friendship;
  const friendName = friendProfile.display_name ?? friendProfile.username;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Breathing pulse for reveal_ready state
  useEffect(() => {
    if (state !== 'reveal_ready') {
      scaleAnim.setValue(1);
      return;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.018,
          duration: 1100,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 1100,
          useNativeDriver: true,
        }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [state, scaleAnim]);

  // Countdown for your_turn
  const [countdown, setCountdown] = useState(
    expiresAt ? getTimeRemaining(expiresAt) : '',
  );
  useEffect(() => {
    if (!expiresAt || state !== 'your_turn') return;
    const iv = setInterval(() => setCountdown(getTimeRemaining(expiresAt)), 60_000);
    return () => clearInterval(iv);
  }, [expiresAt, state]);

  const borderColor =
    state === 'reveal_ready' ? colors.stateRevealReady
    : state === 'your_turn'  ? colors.stateYourTurn
    :                          colors.stateWaiting;

  const cardShadow =
    state === 'reveal_ready' ? shadows.goldGlow
    : state === 'your_turn'  ? shadows.emberGlow
    :                          shadows.soft;

  return (
    <Pressable
      testID={`friendship-card-${id}`}
      onPress={() => onPress(id)}
      style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1 })}
    >
      <Animated.View
        style={[
          styles.card,
          { borderColor },
          cardShadow,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Header: avatar + name + state label + streak */}
        <View style={styles.header}>
          <Avatar name={friendName} />
          <View style={styles.headerText}>
            <Text style={styles.friendName} numberOfLines={1}>
              {friendName}
            </Text>
            <StateLabel state={state} />
          </View>
          <StreakBadge count={streakCount} />
        </View>

        {/* Question preview */}
        {questionText != null && (
          <Text style={styles.questionPreview} numberOfLines={2}>
            {getPreview(questionText)}
          </Text>
        )}

        {/* Countdown (your_turn only) */}
        {state === 'your_turn' && expiresAt != null && (
          <Text style={styles.countdown}>{countdown}</Text>
        )}

        {/* CTA row */}
        <View
          style={[
            styles.ctaRow,
            state === 'reveal_ready' ? styles.ctaReveal
            : state === 'your_turn'  ? styles.ctaYourTurn
            :                          styles.ctaWaiting,
          ]}
        >
          <Text
            style={[
              styles.ctaText,
              state === 'reveal_ready' ? styles.ctaTextReveal
              : state === 'your_turn'  ? styles.ctaTextYourTurn
              :                          styles.ctaTextWaiting,
            ]}
          >
            {state === 'reveal_ready'
              ? 'Watch Now 👀'
              : state === 'your_turn'
              ? 'Record Answer'
              : `Waiting for ${friendName}...`}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    padding: spacing[5],
    marginBottom: spacing[4],
  },

  // Avatar
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surface3,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
    borderWidth: 1,
    borderColor: colors.strokeStrong,
  },
  avatarText: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontWeight: '600',
    letterSpacing: typography.letterSpacing.wider,
  },

  // Header layout
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[3],
  },
  headerText: {
    flex: 1,
    gap: 3,
  },
  friendName: {
    color: colors.text,
    fontSize: typography.sizes.md,
    fontWeight: '600',
    letterSpacing: typography.letterSpacing.tight,
  },
  stateLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: '500',
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },

  // Streak badge
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    gap: 3,
    borderWidth: 1,
    borderColor: colors.strokeStrong,
  },
  streakCount: {
    color: colors.gold,
    fontSize: typography.sizes.sm,
    fontWeight: '700',
  },

  // Question
  questionPreview: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * typography.lineHeights.relaxed,
    marginBottom: spacing[3],
    fontStyle: 'italic',
  },

  // Countdown
  countdown: {
    color: colors.flame,
    fontSize: typography.sizes.xs,
    fontWeight: '600',
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
    marginBottom: spacing[3],
  },

  // CTA pill
  ctaRow: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
  },
  ctaReveal: {
    backgroundColor: colors.gold,
  },
  ctaYourTurn: {
    backgroundColor: colors.ember,
  },
  ctaWaiting: {
    backgroundColor: 'transparent',
  },
  ctaText: {
    fontSize: typography.sizes.sm,
    fontWeight: '700',
    letterSpacing: typography.letterSpacing.wide,
  },
  ctaTextReveal: {
    color: '#0D0B09', // dark text on gold — maximum contrast
  },
  ctaTextYourTurn: {
    color: '#0D0B09', // dark text on ember
  },
  ctaTextWaiting: {
    color: colors.textMuted,
    fontWeight: '400',
  },
});
