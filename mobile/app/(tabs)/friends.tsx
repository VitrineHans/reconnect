import { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../theme/tokens';

// ── Types ──────────────────────────────────────────────────────────────────

interface ProfileSummary { id: string; username: string; display_name: string | null; }
interface FriendInvite { id: string; from_user: string; status: string; profile: ProfileSummary; }
interface Friendship { id: string; other_user: ProfileSummary; streak_count: number; }

// ── Supabase helpers ───────────────────────────────────────────────────────

async function runSearch(query: string, currentUserId: string): Promise<ProfileSummary[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(10);
  return data ?? [];
}

async function fetchPendingInvites(userId: string): Promise<FriendInvite[]> {
  const { data } = await supabase
    .from('friend_invites')
    .select('id, from_user, status, profile:profiles!from_user(id, username, display_name)')
    .eq('to_user', userId)
    .eq('status', 'pending');
  return (data as FriendInvite[] | null) ?? [];
}

async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data } = await supabase
    .from('friendships')
    .select('id, streak_count, user_a, user_b, profile_a:profiles!user_a(id, username, display_name), profile_b:profiles!user_b(id, username, display_name)')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const isA = row.user_a === userId;
    const other = (isA ? row.profile_b : row.profile_a) as ProfileSummary;
    return { id: row.id as string, other_user: other, streak_count: row.streak_count as number };
  });
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
    const [invites, friends] = await Promise.all([fetchPendingInvites(userId), fetchFriendships(userId)]);
    setPendingInvites(invites);
    setFriendships(friends);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  useEffect(() => {
    if (!search.trim() || !userId) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const results = await runSearch(search, userId);
      setSearchResults(results);
    }, 300);
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

  return { search, setSearch, searchResults, pendingInvites, friendships, loading, sendInvite, respondToInvite };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SearchResultCard({ profile, onAdd }: { profile: ProfileSummary; onAdd: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{profile.display_name ?? profile.username}</Text>
        <Text style={styles.cardSub}>@{profile.username}</Text>
      </View>
      <TouchableOpacity style={styles.addButton} onPress={onAdd}>
        <Text style={styles.addButtonText}>Add</Text>
      </TouchableOpacity>
    </View>
  );
}

function InviteCard({ invite, onAccept, onDecline }: { invite: FriendInvite; onAccept: () => void; onDecline: () => void }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{invite.profile.display_name ?? invite.profile.username}</Text>
        <Text style={styles.cardSub}>@{invite.profile.username} wants to connect 👋</Text>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
          <Text style={styles.acceptText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
          <Text style={styles.declineText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FriendCard({ friendship }: { friendship: Friendship }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{friendship.other_user.display_name ?? friendship.other_user.username}</Text>
        <Text style={styles.cardSub}>@{friendship.other_user.username}</Text>
      </View>
      {friendship.streak_count > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {friendship.streak_count}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const { session } = useSession();
  const userId = session?.user?.id;
  const { search, setSearch, searchResults, pendingInvites, friendships, loading, sendInvite, respondToInvite } = useFriendsData(userId);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Friends 👯</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by username..."
        placeholderTextColor={colors.textMuted}
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      {search.length > 0 && searchResults.length === 0 && (
        <Text style={styles.emptyHint}>No users found</Text>
      )}
      {search.length === 0 && (
        <Text style={styles.emptyHint}>Search for friends by username</Text>
      )}
      {searchResults.map(p => (
        <SearchResultCard key={p.id} profile={p} onAdd={() => sendInvite(p.id)} />
      ))}

      {pendingInvites.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Pending invites</Text>
          {pendingInvites.map(inv => (
            <InviteCard
              key={inv.id}
              invite={inv}
              onAccept={() => respondToInvite(inv.id, 'accepted')}
              onDecline={() => respondToInvite(inv.id, 'declined')}
            />
          ))}
        </>
      )}

      <Text style={styles.sectionTitle}>My Friends</Text>
      {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[4] }} />}
      {!loading && friendships.length === 0 && (
        <Text style={styles.emptyHint}>No friends yet — search above to add someone 🙌</Text>
      )}
      {friendships.map(f => (
        <FriendCard key={f.id} friendship={f} />
      ))}
    </ScrollView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: { backgroundColor: colors.bg },
  container: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[10],
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontFamily: typography.families.display,
    color: colors.text,
    marginBottom: spacing[5],
  },
  searchInput: {
    borderWidth: 1.5,
    borderColor: colors.stroke,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: typography.sizes.base,
    fontFamily: typography.families.body,
    color: colors.text,
    backgroundColor: colors.surface2,
    marginBottom: spacing[3],
  },
  sectionTitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
    color: colors.textSecondary,
    marginTop: spacing[6],
    marginBottom: spacing[3],
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  emptyHint: {
    color: colors.textMuted,
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    marginBottom: spacing[2],
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.stroke,
    borderRadius: radius.md,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    marginBottom: spacing[2],
    backgroundColor: colors.surface,
  },
  cardInfo: { flex: 1 },
  cardName: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
    color: colors.text,
  },
  cardSub: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    color: colors.textSecondary,
    marginTop: 2,
  },
  streakBadge: {
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
  },
  streakText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodyBold,
    color: colors.gold,
  },
  addButton: {
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  addButtonText: {
    color: '#fff',
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
  },
  inviteActions: { flexDirection: 'row', gap: spacing[2] },
  acceptButton: {
    backgroundColor: colors.mint,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  acceptText: { color: '#fff', fontFamily: typography.families.bodySemiBold, fontSize: typography.sizes.base },
  declineButton: {
    borderWidth: 1.5,
    borderColor: colors.stroke,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  declineText: { color: colors.textSecondary, fontFamily: typography.families.body, fontSize: typography.sizes.base },
});
