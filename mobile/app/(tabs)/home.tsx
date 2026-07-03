import { View, Text, FlatList, TouchableOpacity, StyleSheet, ListRenderItemInfo } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../hooks/useSession';
import { useFriendships } from '../../hooks/useFriendships';
import { useGroups } from '../../hooks/useGroups';
import { useUnseenReactions } from '../../hooks/useReactions';
import { mergeFeed, type FeedItem } from '../../lib/feed';
import { FriendshipCard } from '../../components/FriendshipCard';
import { GroupCard } from '../../components/GroupCard';
import { SkeletonCard } from '../../components/SkeletonCard';
import { colors, typography, spacing, radius } from '../../theme/tokens';

export default function HomeScreen() {
  const { session } = useSession();
  const router = useRouter();
  const { t } = useTranslation();
  const userId = session?.user?.id ?? null;
  const { friendships, loading, error, refetch } = useFriendships(userId);
  const { groups, loading: groupsLoading, refetch: refetchGroups } = useGroups(userId);
  const { reactions, markSeen, refetch: refetchReactions } = useUnseenReactions(userId);

  useFocusEffect(useCallback(() => {
    refetch();
    refetchGroups();
    refetchReactions();
  }, [refetch, refetchGroups, refetchReactions]));

  // One feed: friendships + groups together, most actionable first.
  const feed = useMemo(() => mergeFeed(friendships, groups), [friendships, groups]);

  const friendshipById = useMemo(
    () => new Map(friendships.map((f) => [f.id, f])),
    [friendships],
  );

  const handleFriendshipPress = useCallback((id: string) => {
    const friendship = friendshipById.get(id);
    if (!friendship) return;
    if (friendship.state === 'reveal_ready') {
      router.push(`/friendship/${id}/reveal`);
    } else if (friendship.state === 'your_turn') {
      router.push(`/friendship/${id}/question`);
    }
    // 'waiting': nothing to see — the answer stays secret until both submit
  }, [friendshipById, router]);

  const handleGroupPress = useCallback((id: string) => {
    // from=home suppresses the leave-group action in the hub
    router.push(`/group/${id}?from=home`);
  }, [router]);

  const renderItem = useCallback(({ item }: ListRenderItemInfo<FeedItem>) => (
    item.kind === 'friendship'
      ? <FriendshipCard friendship={item.friendship} onPress={handleFriendshipPress} />
      : <GroupCard group={item.group} onPress={handleGroupPress} />
  ), [handleFriendshipPress, handleGroupPress]);

  const keyExtractor = useCallback((item: FeedItem) => item.key, []);

  const initialLoading = (loading || groupsLoading) && feed.length === 0;

  if (error && feed.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refetch} accessibilityRole="button">
          <Text style={styles.retryText}>{t('flow.tryAgain')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <FlatList
      data={feed}
      keyExtractor={keyExtractor}
      renderItem={renderItem}
      contentContainerStyle={styles.list}
      style={styles.screen}
      initialNumToRender={6}
      maxToRenderPerBatch={8}
      windowSize={7}
      // no removeClippedSubviews: it can clip the reveal_ready card's animated
      // glow at viewport edges, and the feed is small enough not to need it
      ListHeaderComponent={
        <View>
          <Text style={styles.heading}>{t('home.title')}</Text>
          {reactions.length > 0 && (
            <View style={styles.reactionsBanner}>
              <View style={styles.reactionsHeader}>
                <Text style={styles.reactionsTitle}>{t('reactions.bannerTitle')}</Text>
                <TouchableOpacity onPress={markSeen} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Text style={styles.reactionsDismiss}>{t('reactions.dismiss')}</Text>
                </TouchableOpacity>
              </View>
              {reactions.map((r) => (
                <Text key={r.id} style={styles.reactionItem} numberOfLines={2}>
                  {r.emoji ? `${r.emoji} ` : '💬 '}
                  {t('reactions.reactedToYour', { name: r.fromName })}
                  {r.body ? `: “${r.body}”` : ''}
                </Text>
              ))}
            </View>
          )}
          {initialLoading && (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          )}
        </View>
      }
      ListEmptyComponent={
        initialLoading ? null : <Text style={styles.emptyText}>{t('home.empty')}</Text>
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
  reactionsBanner: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.gold,
    borderRadius: radius.lg,
    padding: spacing[4],
    marginBottom: spacing[5],
  },
  reactionsHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  reactionsTitle: {
    fontSize: typography.sizes.sm, fontFamily: typography.families.bodySemiBold,
    color: colors.text, letterSpacing: typography.letterSpacing.wide, textTransform: 'uppercase',
  },
  reactionsDismiss: {
    fontSize: typography.sizes.sm, fontFamily: typography.families.bodyMedium, color: colors.ember,
  },
  reactionItem: {
    fontSize: typography.sizes.base, fontFamily: typography.families.body,
    color: colors.textSecondary, marginTop: 2,
  },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing[6], backgroundColor: colors.bg },
  emptyText: {
    fontSize: typography.sizes.base, fontFamily: typography.families.body,
    color: colors.textSecondary, textAlign: 'center', marginVertical: spacing[3],
  },
  errorText: {
    fontSize: typography.sizes.sm, fontFamily: typography.families.body,
    color: colors.flame, textAlign: 'center', marginBottom: spacing[4],
  },
  retryButton: {
    borderWidth: 1.5, borderColor: colors.ember, borderRadius: radius.full,
    paddingHorizontal: spacing[5], paddingVertical: spacing[2],
  },
  retryText: {
    color: colors.ember, fontSize: typography.sizes.sm, fontFamily: typography.families.bodySemiBold,
  },
});
