import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { useSession } from '../../hooks/useSession';
import { useFriendships } from '../../hooks/useFriendships';
import type { FriendshipWithState } from '../../hooks/useFriendships';
import { FriendshipCard } from '../../components/FriendshipCard';
import { colors, typography, spacing } from '../../theme/tokens';

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id ?? null;
  const { friendships, loading, error, refetch } = useFriendships(userId);

  useFocusEffect(useCallback(() => { refetch(); }, [userId]));

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
        <FriendshipCard
          friendship={item}
          onPress={() => handleCardPress(item)}
        />
      )}
      contentContainerStyle={styles.list}
      style={styles.screen}
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No friendships yet — invite someone!</Text>
        </View>
      }
      ListHeaderComponent={
        <Text style={styles.heading}>Your Questions</Text>
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.bg,
  },
  list: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    flexGrow: 1,
  },
  heading: {
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.families.display,
    color: colors.text,
    letterSpacing: typography.letterSpacing.tight,
    marginTop: spacing[12],
    marginBottom: spacing[4],
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[6],
  },
  emptyText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    color: colors.flame,
    textAlign: 'center',
  },
});
