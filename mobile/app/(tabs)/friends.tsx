import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────────────

interface ProfileSummary { id: string; username: string; display_name: string | null; avatar_url: string | null; }
interface FriendInvite { id: string; from_user: string; status: string; profile: ProfileSummary; }
interface Friendship { id: string; other_user: ProfileSummary; streak_count: number; }

// ── Supabase query helpers (each ≤15 lines) ────────────────────────────────

async function runSearch(query: string, currentUserId: string, setResults: (r: ProfileSummary[]) => void) {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(10);
  setResults(data ?? []);
}

async function fetchPendingInvites(userId: string, setInvites: (i: FriendInvite[]) => void) {
  const { data } = await supabase
    .from('friend_invites')
    .select('id, from_user, status, profile:profiles!from_user(id, username, display_name, avatar_url)')
    .eq('to_user', userId)
    .eq('status', 'pending');
  setInvites((data as FriendInvite[] | null) ?? []);
}

async function fetchFriendships(userId: string, setList: (f: Friendship[]) => void) {
  const { data } = await supabase
    .from('friendships')
    .select('id, streak_count, user_a, user_b, profile_a:profiles!user_a(id, username, display_name, avatar_url), profile_b:profiles!user_b(id, username, display_name, avatar_url)')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  const mapped: Friendship[] = (data ?? []).map((row: Record<string, unknown>) => {
    const isA = row.user_a === userId;
    const other = (isA ? row.profile_b : row.profile_a) as ProfileSummary;
    return { id: row.id as string, other_user: other, streak_count: row.streak_count as number };
  });
  setList(mapped);
}

// ── Data hook ──────────────────────────────────────────────────────────────

function useFriendsData(userId: string | undefined) {
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<ProfileSummary[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FriendInvite[]>([]);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    await Promise.all([fetchPendingInvites(userId, setPendingInvites), fetchFriendships(userId, setFriendships)]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!search.trim() || !userId) { setSearchResults([]); return; }
    const timer = setTimeout(() => runSearch(search, userId, setSearchResults), 300);
    return () => clearTimeout(timer);
  }, [search, userId]);

  const sendInvite = async (toUserId: string) => {
    const { error } = await supabase.from('friend_invites').insert({ from_user: userId, to_user: toUserId });
    if (error?.code === '23505') { Alert.alert('Already sent', 'You already sent this person an invite.'); return; }
    if (error) { Alert.alert('Error', error.message); return; }
    await fetchAll();
  };

  const respondToInvite = async (inviteId: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase.from('friend_invites').update({ status }).eq('id', inviteId);
    if (error) { Alert.alert('Error', error.message); return; }
    await fetchAll();
  };

  return { search, setSearch, searchResults, pendingInvites, friendships, loading, sendInvite, respondToInvite, refresh: fetchAll };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SearchResultCard({ profile, onAdd }: { profile: ProfileSummary; onAdd: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{profile.display_name ?? profile.username}</Text>
      <Text style={styles.cardUsername}>@{profile.username}</Text>
      <TouchableOpacity style={styles.addButton} onPress={onAdd}><Text style={styles.addButtonText}>Add</Text></TouchableOpacity>
    </View>
  );
}

function InviteCard({ invite, onAccept, onDecline }: { invite: FriendInvite; onAccept: () => void; onDecline: () => void }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{invite.profile.display_name ?? invite.profile.username}</Text>
      <Text style={styles.cardUsername}>@{invite.profile.username} wants to connect</Text>
      <View style={styles.inviteActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}><Text style={styles.acceptText}>Accept</Text></TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}><Text style={styles.declineText}>Decline</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function FriendCard({ friendship }: { friendship: Friendship }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardName}>{friendship.other_user.display_name ?? friendship.other_user.username}</Text>
      <Text style={styles.cardUsername}>@{friendship.other_user.username}</Text>
      <Text style={styles.streak}>{friendship.streak_count} day streak</Text>
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const { search, setSearch, searchResults, pendingInvites, friendships, loading, sendInvite, respondToInvite } = useFriendsData(userId);

  if (loading) return <View style={styles.container}><ActivityIndicator /></View>;

  return (
    <FlatList
      style={styles.list}
      ListHeaderComponent={() => (
        <View style={styles.container}>
          <Text style={styles.title}>Friends</Text>

          <TextInput style={styles.searchInput} placeholder="Search by username..." value={search} onChangeText={setSearch} autoCapitalize="none" autoCorrect={false} />
          {searchResults.length === 0 && search.length === 0 && <Text style={styles.emptyHint}>Search for friends by username</Text>}
          {searchResults.map(p => <SearchResultCard key={p.id} profile={p} onAdd={() => sendInvite(p.id)} />)}

          {pendingInvites.length > 0 && <Text style={styles.sectionTitle}>Pending invites</Text>}
          {pendingInvites.map(inv => (
            <InviteCard key={inv.id} invite={inv}
              onAccept={() => respondToInvite(inv.id, 'accepted')}
              onDecline={() => respondToInvite(inv.id, 'declined')} />
          ))}

          <Text style={styles.sectionTitle}>My Friends</Text>
          {friendships.length === 0 && <Text style={styles.emptyHint}>No friends yet — search above to add someone</Text>}
        </View>
      )}
      data={friendships}
      keyExtractor={f => f.id}
      renderItem={({ item }) => <FriendCard friendship={item} />}
    />
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  list: { backgroundColor: '#fff' },
  container: { padding: 24 },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 20, marginTop: 40 },
  searchInput: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 24, marginBottom: 8, color: '#333' },
  emptyHint: { color: '#999', fontSize: 14, marginBottom: 8 },
  card: { borderWidth: 1, borderColor: '#eee', borderRadius: 8, padding: 14, marginBottom: 8 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardUsername: { fontSize: 13, color: '#666', marginTop: 2 },
  streak: { fontSize: 13, color: '#f97316', marginTop: 4 },
  addButton: { position: 'absolute', right: 14, top: 14, backgroundColor: '#000', borderRadius: 6, paddingHorizontal: 12, paddingVertical: 6 },
  addButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  inviteActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
  acceptButton: { flex: 1, backgroundColor: '#000', borderRadius: 6, padding: 10, alignItems: 'center' },
  acceptText: { color: '#fff', fontWeight: '600' },
  declineButton: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, padding: 10, alignItems: 'center' },
  declineText: { color: '#666' },
});
