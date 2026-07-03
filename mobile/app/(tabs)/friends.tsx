import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';
import { sendExpoPushNotification } from '../../hooks/useNotifications';
import { removeFriendship } from '../../hooks/useFriendships';
import { useGroups, type GroupWithState } from '../../hooks/useGroups';
import { validateSearchQuery, resolveLookupStatus, type LookupStatus } from '../../lib/friendLookup';
import { Avatar, AvatarStack } from '../../components/Avatar';
import { colors, typography, spacing, radius } from '../../theme/tokens';

// ── Types ──────────────────────────────────────────────────────────────────

interface ProfileSummary { id: string; username: string; display_name: string | null; avatar_url: string | null }
interface FriendInvite { id: string; from_user: string; status: string; profile: ProfileSummary }
interface Friendship { id: string; other_user: ProfileSummary; streak_count: number }

// ── Supabase helpers ───────────────────────────────────────────────────────

async function runSearch(query: string, currentUserId: string): Promise<ProfileSummary[]> {
  const { data } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .ilike('username', `%${query}%`)
    .neq('id', currentUserId)
    .limit(10);
  return data ?? [];
}

async function fetchPendingInvites(userId: string): Promise<FriendInvite[]> {
  const { data } = await supabase
    .from('friend_invites')
    .select('id, from_user, status, profile:profiles!from_user(id, username, display_name, avatar_url)')
    .eq('to_user', userId)
    .eq('status', 'pending');
  return (data as FriendInvite[] | null) ?? [];
}

async function fetchOutgoingPending(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('friend_invites')
    .select('to_user')
    .eq('from_user', userId)
    .eq('status', 'pending');
  return new Set((data ?? []).map((r) => r.to_user as string));
}

async function fetchFriendships(userId: string): Promise<Friendship[]> {
  const { data } = await supabase
    .from('friendships')
    .select('id, streak_count, user_a, user_b, profile_a:profiles!user_a(id, username, display_name, avatar_url), profile_b:profiles!user_b(id, username, display_name, avatar_url)')
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const isA = row.user_a === userId;
    const other = (isA ? row.profile_b : row.profile_a) as ProfileSummary;
    return { id: row.id as string, other_user: other, streak_count: row.streak_count as number };
  });
}

// ── Data hook ──────────────────────────────────────────────────────────────

type SearchState = 'idle' | 'invalid' | 'searching' | 'done';

function useFriendsData(userId: string | undefined) {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const [searchState, setSearchState] = useState<SearchState>('idle');
  const [searchResults, setSearchResults] = useState<ProfileSummary[]>([]);
  const [pendingInvites, setPendingInvites] = useState<FriendInvite[]>([]);
  const [outgoingIds, setOutgoingIds] = useState<Set<string>>(new Set());
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [loading, setLoading] = useState(true);
  const requestSeq = useRef(0);

  const fetchAll = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    const [invites, friends, outgoing] = await Promise.all([
      fetchPendingInvites(userId),
      fetchFriendships(userId),
      fetchOutgoingPending(userId),
    ]);
    setPendingInvites(invites);
    setFriendships(friends);
    setOutgoingIds(outgoing);
    setLoading(false);
  }, [userId]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Debounced, validated username lookup. A request sequence guards against
  // stale responses landing after a newer query.
  useEffect(() => {
    const validation = validateSearchQuery(search);
    if (validation === 'empty') { setSearchState('idle'); setSearchResults([]); return; }
    if (validation === 'invalid') { setSearchState('invalid'); setSearchResults([]); return; }
    if (!userId) return;

    setSearchState('searching');
    const seq = ++requestSeq.current;
    const timer = setTimeout(async () => {
      const results = await runSearch(search.trim(), userId);
      if (seq !== requestSeq.current) return; // a newer query superseded this one
      setSearchResults(results);
      setSearchState('done');
    }, 300);
    return () => clearTimeout(timer);
  }, [search, userId]);

  const sendInvite = async (toUserId: string) => {
    // Optimistic: flip the row to "request sent" immediately, roll back on failure.
    setOutgoingIds((prev) => new Set(prev).add(toUserId));
    const { error } = await supabase.from('friend_invites').insert({ from_user: userId, to_user: toUserId });
    if (error && error.code !== '23505') { // 23505 = already sent, which is the state we show anyway
      setOutgoingIds((prev) => { const next = new Set(prev); next.delete(toUserId); return next; });
      Alert.alert(t('common.error'), error.message);
      return;
    }
    try {
      const { data: recipientProfile } = await supabase
        .from('profiles')
        .select('push_token')
        .eq('id', toUserId)
        .single();
      if (recipientProfile?.push_token) {
        // NOTE: sent in the sender's language; localize to the recipient's
        // stored locale once profiles persist a language preference.
        await sendExpoPushNotification(
          recipientProfile.push_token,
          t('friends.pushInviteTitle'),
          t('friends.pushInviteBody'),
          { screen: 'friends' },
        );
      }
    } catch {
      // push failure must not block invite send
    }
    // Non-blocking reconcile: the optimistic state is already visible, but a
    // background refresh picks up any race (e.g. their invite crossed ours).
    void fetchAll();
  };

  const respondToInvite = async (inviteId: string, status: 'accepted' | 'declined') => {
    const { error } = await supabase.from('friend_invites').update({ status }).eq('id', inviteId);
    if (error) { Alert.alert(t('common.error'), error.message); return; }
    if (status === 'accepted') {
      // Assign a question to the new friendship immediately (cron only runs at midnight)
      await supabase.rpc('rotate_daily_questions');
    }
    await fetchAll();
  };

  const removeFriend = async (friendshipId: string, friendId: string) => {
    if (!userId) return;
    try {
      await removeFriendship(friendshipId, friendId, userId);
    } catch (e) {
      Alert.alert(t('friends.removeFailed'), e instanceof Error ? e.message : '');
      return;
    }
    await fetchAll();
  };

  return {
    search, setSearch, searchState, searchResults,
    pendingInvites, outgoingIds, friendships, loading,
    sendInvite, respondToInvite, removeFriend,
  };
}

// ── Sub-components ─────────────────────────────────────────────────────────

function SearchResultCard({ profile, status, onAdd }: { profile: ProfileSummary; status: LookupStatus; onAdd: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Avatar name={profile.display_name ?? profile.username} url={profile.avatar_url} size={40} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{profile.display_name ?? profile.username}</Text>
        <Text style={styles.cardSub}>@{profile.username}</Text>
      </View>
      {status === 'none' && (
        <TouchableOpacity style={styles.addButton} onPress={onAdd} accessibilityRole="button">
          <Text style={styles.addButtonText}>{t('friends.add')}</Text>
        </TouchableOpacity>
      )}
      {status === 'friend' && <Text style={styles.statusFriend}>{t('friends.alreadyFriends')}</Text>}
      {status === 'sent' && <Text style={styles.statusSent}>{t('friends.requestSent')}</Text>}
      {status === 'incoming' && <Text style={styles.statusSent}>{t('friends.invitedYou')}</Text>}
    </View>
  );
}

function InviteCard({ invite, onAccept, onDecline }: { invite: FriendInvite; onAccept: () => void; onDecline: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={styles.card}>
      <Avatar name={invite.profile.display_name ?? invite.profile.username} url={invite.profile.avatar_url} size={40} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{invite.profile.display_name ?? invite.profile.username}</Text>
        <Text style={styles.cardSub}>{t('friends.wantsToConnect', { username: invite.profile.username })}</Text>
      </View>
      <View style={styles.inviteActions}>
        <TouchableOpacity style={styles.acceptButton} onPress={onAccept} accessibilityRole="button">
          <Text style={styles.acceptText}>✓</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.declineButton} onPress={onDecline} accessibilityRole="button">
          <Text style={styles.declineText}>✕</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function FriendCard({ friendship, onLongPress }: { friendship: Friendship; onLongPress: () => void }) {
  return (
    <TouchableOpacity style={styles.card} onLongPress={onLongPress} delayLongPress={350} activeOpacity={0.7}>
      <Avatar name={friendship.other_user.display_name ?? friendship.other_user.username} url={friendship.other_user.avatar_url} size={40} />
      <View style={styles.cardInfo}>
        <Text style={styles.cardName}>{friendship.other_user.display_name ?? friendship.other_user.username}</Text>
        <Text style={styles.cardSub}>@{friendship.other_user.username}</Text>
      </View>
      {friendship.streak_count > 0 && (
        <View style={styles.streakBadge}>
          <Text style={styles.streakText}>🔥 {friendship.streak_count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/** A group in the groups view: photo + basic info only — never the question. */
function GroupListRow({ group, onPress }: { group: GroupWithState; onPress: () => void }) {
  const { t } = useTranslation();
  const stackMembers = group.members.map((m) => ({
    id: m.id,
    name: m.display_name ?? m.username,
    url: m.avatar_url,
  }));
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7} testID={`group-row-${group.id}`}>
      <AvatarStack members={stackMembers} size={30} max={3} />
      <View style={[styles.cardInfo, styles.groupInfo]}>
        <Text style={styles.cardName}>{group.name}</Text>
        <Text style={styles.cardSub}>{t('group.members', { count: group.members.length })}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

// ── Main screen ────────────────────────────────────────────────────────────

export default function FriendsScreen() {
  const { t } = useTranslation();
  const { session } = useSession();
  const userId = session?.user?.id;
  const router = useRouter();
  const [view, setView] = useState<'friends' | 'groups'>('friends');
  const {
    search, setSearch, searchState, searchResults,
    pendingInvites, outgoingIds, friendships, loading,
    sendInvite, respondToInvite, removeFriend,
  } = useFriendsData(userId);
  const { groups, loading: groupsLoading, error: groupsError, refetch: refetchGroups } = useGroups(userId ?? null);

  const friendIds = useMemo(() => new Set(friendships.map((f) => f.other_user.id)), [friendships]);
  const incomingIds = useMemo(() => new Set(pendingInvites.map((i) => i.from_user)), [pendingInvites]);

  const confirmRemove = (f: Friendship) => {
    const name = f.other_user.display_name ?? f.other_user.username;
    Alert.alert(
      t('friends.removeConfirmTitle'),
      t('friends.removeConfirmBody', { name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('friends.remove'), style: 'destructive', onPress: () => removeFriend(f.id, f.other_user.id) },
      ],
    );
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>{t('friends.title')}</Text>

      {/* Friends / Groups segmented control */}
      <View style={styles.segment}>
        <TouchableOpacity
          style={[styles.segmentBtn, view === 'friends' && styles.segmentBtnActive]}
          onPress={() => setView('friends')}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === 'friends' }}
        >
          <Text style={[styles.segmentText, view === 'friends' && styles.segmentTextActive]}>{t('tabs.friends')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, view === 'groups' && styles.segmentBtnActive]}
          onPress={() => setView('groups')}
          accessibilityRole="tab"
          accessibilityState={{ selected: view === 'groups' }}
        >
          <Text style={[styles.segmentText, view === 'groups' && styles.segmentTextActive]}>{t('group.sectionTitle')}</Text>
        </TouchableOpacity>
      </View>

      {view === 'friends' ? (
        <>
          <TextInput
            style={styles.searchInput}
            placeholder={t('friends.searchPlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel={t('friends.searchHint')}
          />

          {searchState === 'idle' && (
            <Text style={styles.emptyHint}>{t('friends.searchHint')}</Text>
          )}
          {searchState === 'invalid' && (
            <Text style={styles.invalidHint}>{t('friends.invalidQuery')}</Text>
          )}
          {searchState === 'searching' && (
            <View style={styles.searchingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.emptyHint}>{t('friends.searching')}</Text>
            </View>
          )}
          {searchState === 'done' && searchResults.length === 0 && (
            <Text style={styles.emptyHint}>{t('friends.noUsersFound')}</Text>
          )}
          {searchState === 'done' && searchResults.map((p) => (
            <SearchResultCard
              key={p.id}
              profile={p}
              status={resolveLookupStatus(p.id, friendIds, outgoingIds, incomingIds)}
              onAdd={() => sendInvite(p.id)}
            />
          ))}

          {pendingInvites.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('friends.pendingInvites')}</Text>
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

          <Text style={styles.sectionTitle}>{t('friends.myFriends')}</Text>
          {loading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[4] }} />}
          {!loading && friendships.length === 0 && (
            <Text style={styles.emptyHint}>{t('friends.noFriends')}</Text>
          )}
          {friendships.length > 0 && (
            <Text style={styles.emptyHint}>{t('friends.removeHint')}</Text>
          )}
          {friendships.map(f => (
            <FriendCard key={f.id} friendship={f} onLongPress={() => confirmRemove(f)} />
          ))}
        </>
      ) : (
        <>
          <TouchableOpacity style={styles.newGroupBtn} onPress={() => router.push('/group/create')} accessibilityRole="button">
            <Text style={styles.newGroupText}>{t('group.newGroup')}</Text>
          </TouchableOpacity>
          {groupsLoading && <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[4] }} />}
          {!groupsLoading && groupsError != null && (
            <TouchableOpacity onPress={refetchGroups}>
              <Text style={styles.invalidHint}>{t('group.loadFailed')} — {t('flow.tryAgain')}</Text>
            </TouchableOpacity>
          )}
          {!groupsLoading && groupsError == null && groups.length === 0 && (
            <Text style={styles.emptyHint}>{t('group.noGroups')}</Text>
          )}
          {!groupsLoading && groups.map(g => (
            <GroupListRow key={g.id} group={g} onPress={() => router.push(`/group/${g.id}`)} />
          ))}
        </>
      )}
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
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surface2,
    borderRadius: radius.full,
    padding: 4,
    marginBottom: spacing[5],
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    alignItems: 'center',
  },
  segmentBtnActive: {
    backgroundColor: colors.surface,
  },
  segmentText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
    color: colors.textMuted,
  },
  segmentTextActive: {
    color: colors.text,
  },
  newGroupBtn: {
    borderWidth: 1.5,
    borderColor: colors.ember,
    borderRadius: radius.md,
    paddingVertical: spacing[3],
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  newGroupText: {
    color: colors.ember,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
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
  invalidHint: {
    color: colors.flame,
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.body,
    marginBottom: spacing[2],
  },
  searchingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
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
    gap: spacing[3],
  },
  cardInfo: { flex: 1 },
  groupInfo: { marginLeft: spacing[1] },
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
  statusFriend: {
    color: colors.mint,
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
  },
  statusSent: {
    color: colors.textSecondary,
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodyMedium,
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
  chevron: {
    fontSize: typography.sizes.lg,
    color: colors.textMuted,
  },
});
