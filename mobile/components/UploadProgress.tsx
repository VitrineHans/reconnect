import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
  container: { alignItems: 'center', paddingHorizontal: 24, gap: 8 },
  track: {
    width: '100%',
    height: 4,
    backgroundColor: '#eee',
    borderRadius: 2,
    overflow: 'hidden',
  },
  bar: { height: 4, backgroundColor: '#6B4EFF', borderRadius: 2 },
  label: { fontSize: 14, color: '#333' },
});
