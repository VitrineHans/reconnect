import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing, radius } from '../theme/tokens';

type Props = {
  progress: number;
  visible: boolean;
};

export function UploadProgress({ progress, visible }: Props) {
  if (!visible) return null;

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.bar, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.label}>{progress}%</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: spacing[6],
    gap: spacing[2],
    width: '100%',
  },
  track: {
    width: '100%',
    height: 6,
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  bar: {
    height: 6,
    backgroundColor: colors.ember,
    borderRadius: radius.full,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodyMedium,
    color: colors.textSecondary,
    alignSelf: 'flex-end',
  },
});
