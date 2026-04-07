import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type FriendshipState = 'reveal_ready' | 'your_turn' | 'waiting';

export interface FriendProfile {
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface FriendshipWithState {
  id: string;
  friendId: string;
  friendProfile: FriendProfile;
  streakCount: number;
  questionText: string | null;
  state: FriendshipState;
  expiresAt: string | null;
  myResponseId: string | null;
  currentQuestionId: string | null;
}

const STATE_PRIORITY: Record<FriendshipState, number> = {
  reveal_ready: 0,
  your_turn: 1,
  waiting: 2,
};

interface RawResponse {
  id: string;
  user_id: string;
  question_id: string;
  watched_at: string | null;
  expires_at: string | null;
}

interface RawFriendship {
  id: string;
  streak_count: number;
  user_a: string;
  user_b: string;
  current_question_id: string | null;
  questions: { text: string } | null;
  question_responses: RawResponse[];
}

async function fetchFriendshipsWithState(userId: string): Promise<FriendshipWithState[]> {
  const { data, error } = await supabase
    .from('friendships')
    .select(`
      id,
      streak_count,
      user_a,
      user_b,
      current_question_id,
      questions!current_question_id ( text ),
      question_responses ( id, user_id, question_id, watched_at, expires_at )
    `)
    .or(`user_a.eq.${userId},user_b.eq.${userId}`);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawFriendship[];
  const friendIds = rows.map((f) => (f.user_a === userId ? f.user_b : f.user_a));

  const profileMap = await fetchProfileMap(friendIds);

  return rows
    .map((f) => buildFriendshipWithState(f, userId, profileMap))
    .sort((a, b) => STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state]);
}

async function fetchProfileMap(ids: string[]): Promise<Map<string, FriendProfile>> {
  if (ids.length === 0) return new Map();

  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url')
    .in('id', ids);

  if (error) throw new Error(error.message);

  const map = new Map<string, FriendProfile>();
  for (const p of data ?? []) {
    map.set(p.id, {
      username: p.username,
      display_name: p.display_name,
      avatar_url: p.avatar_url,
    });
  }
  return map;
}

function buildFriendshipWithState(
  f: RawFriendship,
  userId: string,
  profileMap: Map<string, FriendProfile>,
): FriendshipWithState {
  const friendId = f.user_a === userId ? f.user_b : f.user_a;

  // Only consider responses for the current question (stale rows from previous
  // rounds may still exist if cleanup raced with a refetch).
  const currentQId = f.current_question_id;
  const responses = (f.question_responses ?? []).filter(
    (r) => r.question_id === currentQId,
  );

  const myResponse = responses.find((r) => r.user_id === userId) ?? null;
  const friendResponse = responses.find((r) => r.user_id !== userId) ?? null;

  const iSubmitted = myResponse !== null;
  const bothSubmitted = responses.length === 2;

  // completeReveal sets watched_at on the video that was watched, which is
  // the FRIEND's response row (storagePath = friend's video_url). So to know
  // whether I have already watched, check the friend's watched_at, not mine.
  const iWatched = friendResponse !== null && friendResponse.watched_at !== null;

  // reveal_ready: both submitted AND I haven't watched friend's video yet
  // your_turn:    I haven't submitted yet
  // waiting:      I submitted but friend hasn't, OR I've already watched
  let state: FriendshipState;
  if (bothSubmitted && !iWatched) {
    state = 'reveal_ready';
  } else if (!iSubmitted) {
    state = 'your_turn';
  } else {
    state = 'waiting';
  }

  // Streak is incremented on send (handled in record.tsx), so we show it live.
  const fallbackProfile: FriendProfile = { username: friendId, display_name: null, avatar_url: null };

  return {
    id: f.id,
    friendId,
    friendProfile: profileMap.get(friendId) ?? fallbackProfile,
    streakCount: f.streak_count,
    questionText: f.questions?.text ?? null,
    state,
    expiresAt: myResponse?.expires_at ?? null,
    myResponseId: myResponse?.id ?? null,
    currentQuestionId: currentQId,
  };
}

export interface UseFriendshipsResult {
  friendships: FriendshipWithState[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useFriendships(userId: string | null): UseFriendshipsResult {
  const [friendships, setFriendships] = useState<FriendshipWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!userId) {
      setFriendships([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchFriendshipsWithState(userId)
      .then(setFriendships)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, [userId]);

  // Realtime: refetch when any question_response or friendship changes
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`friendships_realtime_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_responses' }, () => {
        fetchFriendshipsWithState(userId)
          .then(setFriendships)
          .catch(() => {});
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'friendships' }, () => {
        fetchFriendshipsWithState(userId)
          .then(setFriendships)
          .catch(() => {});
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { friendships, loading, error, refetch: load };
}
