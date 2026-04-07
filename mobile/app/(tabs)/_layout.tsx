import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Slot, useRouter, usePathname } from 'expo-router';
import { colors, typography, spacing } from '../../theme/tokens';

const TABS = [
  { name: 'home',    label: 'Home',    icon: '🏠' },
  { name: 'friends', label: 'Friends', icon: '👯' },
  { name: 'profile', label: 'Profile', icon: '👤' },
] as const;

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.root}>
      <View style={styles.content}>
        <Slot />
      </View>
      <View style={styles.tabBar}>
        {TABS.map((tab) => {
          const active = pathname.endsWith(tab.name);
          return (
            <TouchableOpacity
              key={tab.name}
              style={styles.tab}
              onPress={() => router.replace(`/(tabs)/${tab.name}`)}
              activeOpacity={0.7}
            >
              <Text style={styles.icon}>{tab.icon}</Text>
              <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
              {active && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.stroke,
    paddingBottom: 24,
    paddingTop: spacing[2],
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  icon: {
    fontSize: 20,
  },
  label: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodyMedium,
    color: colors.textMuted,
    letterSpacing: typography.letterSpacing.wide,
  },
  labelActive: {
    color: colors.primary,
    fontFamily: typography.families.bodySemiBold,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary,
    marginTop: 2,
  },
});
