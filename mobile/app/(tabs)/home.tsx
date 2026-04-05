import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../hooks/useSession';
import { useFriendships } from '../../hooks/useFriendships';
import type { FriendshipWithState } from '../../hooks/useFriendships';
import { FriendshipCard } from '../../components/FriendshipCard';

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const userId = session?.user?.id ?? null;
  const { friendships, loading, error } = useFriendships(userId);

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
        <ActivityIndicator size="large" />
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
      ListEmptyComponent={
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No friendships yet — invite someone!</Text>
        </View>
      }
      ListHeaderComponent={<Text style={styles.heading}>Your Questions</Text>}
    />
  );
}

const styles = StyleSheet.create({
  list: { padding: 16, flexGrow: 1 },
  heading: { fontSize: 24, fontWeight: 'bold', marginTop: 48, marginBottom: 16 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center' },
  errorText: { fontSize: 14, color: '#c62828', textAlign: 'center' },
});
