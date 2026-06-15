import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../hooks/useSession';
import { useFriendships } from '../../hooks/useFriendships';
import type { FriendshipWithState } from '../../hooks/useFriendships';
import { useGroups } from '../../hooks/useGroups';
import { FriendshipCard } from '../../components/FriendshipCard';
import { GroupCard } from '../../components/GroupCard';
import { colors, typography, spacing } from '../../theme/tokens';

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = session?.user?.id ?? null;
  const { friendships, loading, error, refetch } = useFriendships(userId);
  const { groups, refetch: refetchGroups } = useGroups(userId);

  useFocusEffect(useCallback(() => {
    refetch();
    refetchGroups();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]));

  function handleCardPress(friendship: FriendshipWithState) {
    if (friendship.state === 'reveal_ready') {
      router.push(`/friendship/${friendship.id}/reveal`);
    } else if (friendship.state === 'your_turn') {
      router.push(`/friendship/${friendship.id}/question`);
    }
    // 'waiting' state: no-op
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.ember} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={friendships}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <FriendshipCard friendship={item} onPress={() => handleCardPress(item)} />
      )}
      contentContainerStyle={styles.list}
      style={styles.screen}
      ListHeaderComponent={<Text style={styles.heading}>{t('home.title')}</Text>}
      ListEmptyComponent={
        <Text style={styles.emptyText}>{t('home.empty')}</Text>
      }
      ListFooterComponent={
        <View style={styles.groupsSection}>
          <View style={styles.groupsHeader}>
            <Text style={styles.groupsTitle}>{t('group.sectionTitle')}</Text>
            <TouchableOpacity onPress={() => router.push('/group/create')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.newGroup}>{t('group.newGroup')}</Text>
            </TouchableOpacity>
          </View>
          {groups.length === 0 ? (
            <Text style={styles.emptyText}>{t('group.noGroups')}</Text>
          ) : (
            groups.map((g) => (
              <GroupCard key={g.id} group={g} onPress={() => router.push(`/group/${g.id}`)} />
            ))
          )}
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: colors.bg },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[8], flexGrow: 1 },
  heading: {
    fontSize: typography.sizes['2xl'], fontFamily: typography.families.display,
    color: colors.text, letterSpacing: typography.letterSpacing.tight,
    marginTop: spacing[12], marginBottom: spacing[4],
  },
  groupsSection: { marginTop: spacing[6] },
  groupsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing[4],
  },
  groupsTitle: {
    fontSize: typography.sizes.lg, fontFamily: typography.families.display, color: colors.text,
  },
  newGroup: {
    fontSize: typography.sizes.sm, fontFamily: typography.families.bodySemiBold, color: colors.ember,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6] },
  emptyText: {
    fontSize: typography.sizes.base, fontFamily: typography.families.body,
    color: colors.textSecondary, textAlign: 'center', marginVertical: spacing[3],
  },
  errorText: {
    fontSize: typography.sizes.sm, fontFamily: typography.families.body,
    color: colors.flame, textAlign: 'center',
  },
});
