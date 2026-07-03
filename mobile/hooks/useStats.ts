import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { deriveStreaks, type ProfileStats, type StreakRow } from '../lib/stats';

/**
 * Profile stats — three minimal parallel queries (only the columns needed):
 * counters on my profile row, streaks across my friendships, and my group
 * membership count (head request, no rows transferred).
 */
async function fetchStats(userId: string): Promise<ProfileStats> {
  const [profileRes, friendshipsRes, groupsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('total_answers, created_at')
      .eq('id', userId)
      .single(),
    supabase
      .from('friendships')
      .select('streak_count, best_streak')
      .or(`user_a.eq.${userId},user_b.eq.${userId}`),
    supabase
      .from('group_members')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId),
  ]);

  if (profileRes.error) throw new Error(profileRes.error.message);
  if (friendshipsRes.error) throw new Error(friendshipsRes.error.message);
  if (groupsRes.error) throw new Error(groupsRes.error.message);

  const rows = (friendshipsRes.data ?? []) as StreakRow[];
  const { current, longest } = deriveStreaks(rows);

  return {
    currentStreak: current,
    longestStreak: longest,
    totalAnswers: profileRes.data?.total_answers ?? 0,
    friendsCount: rows.length,
    groupsCount: groupsRes.count ?? 0,
    memberSince: profileRes.data?.created_at ?? null,
  };
}

export interface UseStatsResult {
  stats: ProfileStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useStats(userId: string | null): UseStatsResult {
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!userId) {
      setStats(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchStats(userId)
      .then(setStats)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  return { stats, loading, error, refetch: load };
}
