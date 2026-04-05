import { View, Text, FlatList, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useSession } from '../../hooks/useSession';
import { useFriendships, FriendshipWithState } from '../../hooks/useFriendships';

function formatTimeRemaining(expiresAt: string | null): string {
  if (!expiresAt) return '';
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 'Expired';
  const hours = Math.floor(ms / 3_600_000);
  const minutes = Math.floor((ms % 3_600_000) / 60_000);
  return `${hours}h ${minutes}m left`;
}

function stateLabel(item: FriendshipWithState): string {
  if (item.state === 'reveal_ready') return 'Reveal Ready';
  if (item.state === 'your_turn') return `Your Turn — ${formatTimeRemaining(item.expiresAt)}`;
  return 'Waiting for friend';
}

interface FriendshipCardProps {
  item: FriendshipWithState;
}

function FriendshipCard({ item }: FriendshipCardProps) {
  const name = item.friendProfile.display_name ?? item.friendProfile.username;
  const preview = item.questionText
    ? item.questionText.length > 60
      ? `${item.questionText.slice(0, 60)}…`
      : item.questionText
    : 'No question yet';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.8}>
      <View style={styles.cardHeader}>
        <Text style={styles.friendName}>{name}</Text>
        <Text style={styles.streak}>🔥 {item.streakCount}</Text>
      </View>
      <Text style={styles.questionPreview} numberOfLines={2}>{preview}</Text>
      <Text style={[styles.stateLabel, item.state === 'reveal_ready' && styles.revealReady]}>
        {stateLabel(item)}
      </Text>
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const { session } = useSession();
  const userId = session?.user?.id ?? null;
  const { friendships, loading, error } = useFriendships(userId);

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
      renderItem={({ item }) => <FriendshipCard item={item} />}
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  friendName: { fontSize: 16, fontWeight: '600' },
  streak: { fontSize: 14, color: '#f57c00' },
  questionPreview: { fontSize: 14, color: '#444', marginBottom: 8 },
  stateLabel: { fontSize: 13, color: '#888', fontWeight: '500' },
  revealReady: { color: '#6200ee', fontWeight: '700' },
  emptyText: { fontSize: 16, color: '#888', textAlign: 'center' },
  errorText: { fontSize: 14, color: '#c62828', textAlign: 'center' },
});
