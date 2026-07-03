import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { localizedQuestionText } from '../lib/questionText';

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

/**
 * Load all my groups in a fixed THREE queries (was 1 + 2 per group):
 * my memberships+groups, then all members and all responses batched with
 * `.in(group_id)`. Responses are matched to each group's current question
 * client-side (stale rows from previous rounds may survive rotation races).
 */
async function fetchGroupsWithState(userId: string): Promise<GroupWithState[]> {
  const { data, error } = await supabase
    .from('group_members')
    .select('groups!inner ( id, name, created_by, current_question_id, questions!current_question_id ( text ) )')
    .eq('user_id', userId);
  if (error) throw new Error(error.message);

  const groups = (data ?? []).map(
    (row) => (row as unknown as { groups: RawGroup }).groups,
  );
  if (groups.length === 0) return [];

  const ids = groups.map((g) => g.id);
  const currentQids = groups
    .map((g) => g.current_question_id)
    .filter((q): q is string => q != null);

  const [membersRes, responsesRes] = await Promise.all([
    supabase
      .from('group_members')
      .select('group_id, profiles!user_id ( id, username, display_name, avatar_url )')
      .in('group_id', ids),
    // RLS returns my own responses always, and everyone's once I've answered.
    // Narrowed server-side to the groups' current questions so stale rows
    // from past rounds never inflate the payload.
    currentQids.length > 0
      ? supabase
          .from('question_responses')
          .select('group_id, user_id, question_id')
          .in('group_id', ids)
          .in('question_id', currentQids)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (membersRes.error) throw new Error(membersRes.error.message);
  if (responsesRes.error) throw new Error(responsesRes.error.message);

  const membersByGroup = new Map<string, GroupMemberProfile[]>();
  for (const row of membersRes.data ?? []) {
    const { group_id, profiles } = row as unknown as { group_id: string; profiles: GroupMemberProfile };
    const list = membersByGroup.get(group_id);
    if (list) list.push(profiles);
    else membersByGroup.set(group_id, [profiles]);
  }

  const responsesByGroup = new Map<string, { user_id: string; question_id: string }[]>();
  for (const row of (responsesRes.data ?? []) as { group_id: string; user_id: string; question_id: string }[]) {
    const list = responsesByGroup.get(row.group_id);
    if (list) list.push(row);
    else responsesByGroup.set(row.group_id, [row]);
  }

  return groups.map((raw) => {
    const rows = (responsesByGroup.get(raw.id) ?? []).filter(
      (r) => r.question_id === raw.current_question_id,
    );
    const iAnswered = rows.some((r) => r.user_id === userId);
    const othersAnswered = rows.filter((r) => r.user_id !== userId).length;
    return {
      id: raw.id,
      name: raw.name,
      createdBy: raw.created_by,
      members: membersByGroup.get(raw.id) ?? [],
      questionText: raw.questions ? localizedQuestionText(raw.questions.text) : null,
      currentQuestionId: raw.current_question_id,
      iAnswered,
      othersAnswered,
      state: deriveGroupState(!!raw.current_question_id, iAnswered, othersAnswered),
    };
  });
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

  const load = useCallback(() => {
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
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

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
