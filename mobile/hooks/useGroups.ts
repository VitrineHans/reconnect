import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export const MAX_GROUP_MEMBERS = 8;

export type GroupState = 'your_turn' | 'reveal_ready' | 'waiting';

export interface GroupMemberProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

export interface GroupWithState {
  id: string;
  name: string;
  createdBy: string;
  members: GroupMemberProfile[];
  questionText: string | null;
  currentQuestionId: string | null;
  iAnswered: boolean;
  othersAnswered: number;
  state: GroupState;
}

/**
 * Progressive answer-to-unlock state for a group's current question:
 *  - no question yet            → waiting (rotation hasn't assigned one)
 *  - I haven't answered         → your_turn (record)
 *  - I answered, others have too → reveal_ready (watch them)
 *  - I answered, nobody else yet → waiting
 * Note: before you answer, RLS hides others' responses, so othersAnswered is
 * only meaningful once iAnswered is true.
 */
export function deriveGroupState(
  hasQuestion: boolean,
  iAnswered: boolean,
  othersAnswered: number,
): GroupState {
  if (!hasQuestion) return 'waiting';
  if (!iAnswered) return 'your_turn';
  return othersAnswered > 0 ? 'reveal_ready' : 'waiting';
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a group, add the creator as the first member, assign a question. */
export async function createGroup(name: string, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from('groups')
    .insert({ name: name.trim(), created_by: userId })
    .select('id')
    .single();
  if (error || !data) throw new Error(error?.message ?? 'Failed to create group');

  const groupId = data.id as string;
  const { error: memberError } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: userId });
  if (memberError) throw new Error(memberError.message);

  // Assign the first question now (cron only runs at midnight).
  await supabase.rpc('rotate_group_questions');
  return groupId;
}

/** Add a friend to a group (any member can invite; capped at MAX_GROUP_MEMBERS). */
export async function inviteToGroup(groupId: string, friendId: string): Promise<void> {
  const { count } = await supabase
    .from('group_members')
    .select('*', { count: 'exact', head: true })
    .eq('group_id', groupId);
  if ((count ?? 0) >= MAX_GROUP_MEMBERS) throw new Error('Group is full');

  const { error } = await supabase
    .from('group_members')
    .insert({ group_id: groupId, user_id: friendId });
  if (error && error.code !== '23505') throw new Error(error.message); // ignore already-member
}

/** Leave a group (removes your own membership). */
export async function leaveGroup(groupId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

/** Creator removes a member. */
export async function removeGroupMember(groupId: string, memberId: string): Promise<void> {
  const { error } = await supabase
    .from('group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', memberId);
  if (error) throw new Error(error.message);
}

// ── Fetch ────────────────────────────────────────────────────────────────────

interface RawGroup {
  id: string;
  name: string;
  created_by: string;
  current_question_id: string | null;
  questions: { text: string } | null;
}

async function buildGroupState(raw: RawGroup, userId: string): Promise<GroupWithState> {
  const { data: memberRows } = await supabase
    .from('group_members')
    .select('user_id, profiles!user_id ( id, username, display_name, avatar_url )')
    .eq('group_id', raw.id);

  const members: GroupMemberProfile[] = (memberRows ?? []).map(
    (m) => (m as unknown as { profiles: GroupMemberProfile }).profiles,
  );

  let iAnswered = false;
  let othersAnswered = 0;
  if (raw.current_question_id) {
    // RLS returns my own response always, and everyone's once I've answered.
    const { data: responses } = await supabase
      .from('question_responses')
      .select('user_id')
      .eq('group_id', raw.id)
      .eq('question_id', raw.current_question_id);
    const rows = (responses ?? []) as { user_id: string }[];
    iAnswered = rows.some((r) => r.user_id === userId);
    othersAnswered = rows.filter((r) => r.user_id !== userId).length;
  }

  return {
    id: raw.id,
    name: raw.name,
    createdBy: raw.created_by,
    members,
    questionText: raw.questions?.text ?? null,
    currentQuestionId: raw.current_question_id,
    iAnswered,
    othersAnswered,
    state: deriveGroupState(!!raw.current_question_id, iAnswered, othersAnswered),
  };
}

async function fetchGroupsWithState(userId: string): Promise<GroupWithState[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups!inner ( id, name, created_by, current_question_id, questions!current_question_id ( text ) )')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const groups = (data ?? []).map(
    (row) => (row as unknown as { groups: RawGroup }).groups,
  );
  return Promise.all(groups.map((g) => buildGroupState(g, userId)));
}

export interface UseGroupsResult {
  groups: GroupWithState[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useGroups(userId: string | null): UseGroupsResult {
  const [groups, setGroups] = useState<GroupWithState[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!userId) {
      setGroups([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchGroupsWithState(userId)
      .then(setGroups)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`groups_realtime_${userId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'question_responses' }, () => {
        fetchGroupsWithState(userId).then(setGroups).catch(() => {});
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'group_members' }, () => {
        fetchGroupsWithState(userId).then(setGroups).catch(() => {});
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { groups, loading, error, refetch: load };
}
