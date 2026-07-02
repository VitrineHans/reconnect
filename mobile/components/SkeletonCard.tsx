import { memo, useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme/tokens';

/**
 * Card-shaped loading placeholder — shown instead of a blank screen with a
 * spinner so the feed feels instant while data loads.
 */
export const SkeletonCard = memo(function SkeletonCard() {
  const opacity = useRef(new Animated.Value(0.45)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.45, duration: 700, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  return (
    <View style={styles.card} testID="skeleton-card">
      <Animated.View style={{ opacity }}>
        <View style={styles.header}>
          <View style={styles.avatar} />
          <View style={styles.headerText}>
            <View style={styles.lineShort} />
            <View style={styles.lineTiny} />
          </View>
        </View>
        <View style={styles.lineFull} />
        <View style={styles.lineMost} />
        <View style={styles.pill} />
      </Animated.View>
    </View>
  );
});

const block = {
  backgroundColor: colors.surface3,
  borderRadius: radius.sm,
} as const;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.stroke,
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surface3,
    marginRight: spacing[3],
  },
  headerText: { flex: 1, gap: 6 },
  lineShort: { ...block, height: 14, width: '45%' },
  lineTiny: { ...block, height: 10, width: '30%' },
  lineFull: { ...block, height: 12, width: '100%', marginBottom: spacing[2] },
  lineMost: { ...block, height: 12, width: '75%', marginBottom: spacing[4] },
  pill: { ...block, height: 30, width: 130, borderRadius: radius.full },
});
