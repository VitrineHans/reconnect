import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { sendExpoPushNotification } from './useNotifications';
import i18n from '../lib/i18n';

export interface Reaction {
  emoji?: string;
  body?: string;
}

/**
 * Send a reaction to a friend's reveal: store it (delivered to the recipient
 * in-app) and fire a best-effort push. No-op for an empty reaction.
 */
export async function sendReaction(
  friendshipId: string,
  questionId: string,
  fromUser: string,
  toUser: string,
  reaction: Reaction,
): Promise<void> {
  const emoji = reaction.emoji ?? null;
  const body = reaction.body?.trim() || null;
  if (!emoji && !body) return;

  const { error } = await supabase.from('reveal_reactions').insert({
    friendship_id: friendshipId,
    question_id: questionId,
    from_user: fromUser,
    to_user: toUser,
    emoji,
    body,
  });
  if (error) throw new Error(error.message);

  try {
    const { data: profile } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', toUser)
      .single();
    const token = (profile as { push_token?: string } | null)?.push_token;
    if (token) {
      await sendExpoPushNotification(
        token,
        i18n.t('reactions.pushTitle'),
        [emoji, body].filter(Boolean).join(' '),
        { friendshipId, screen: 'home' },
      );
    }
  } catch {
    // push is best-effort — the in-app delivery already landed
  }
}

export interface UnseenReaction {
  id: string;
  emoji: string | null;
  body: string | null;
  fromName: string;
}

interface RawReaction {
  id: string;
  emoji: string | null;
  body: string | null;
  sender: { username: string; display_name: string | null } | null;
}

/**
 * Reactions to my answers that I haven't seen yet, newest first, plus a way to
 * mark them seen (so they surface once, not as a browsable history).
 */
export function useUnseenReactions(userId: string | null): {
  reactions: UnseenReaction[];
  markSeen: () => void;
  refetch: () => void;
} {
  const [reactions, setReactions] = useState<UnseenReaction[]>([]);

  const load = useCallback(() => {
    if (!userId) { setReactions([]); return; }
    supabase
      .from('reveal_reactions')
      .select('id, emoji, body, sender:profiles!from_user ( username, display_name )')
      .eq('to_user', userId)
      .is('seen_at', null)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as unknown as RawReaction[];
        setReactions(rows.map((r) => ({
          id: r.id,
          emoji: r.emoji,
          body: r.body,
          fromName: r.sender?.display_name ?? r.sender?.username ?? '',
        })));
      });
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const markSeen = useCallback(() => {
    if (reactions.length === 0) return;
    const ids = reactions.map((r) => r.id);
    setReactions([]);
    supabase.from('reveal_reactions').update({ seen_at: new Date().toISOString() }).in('id', ids).then(() => {});
  }, [reactions]);

  return { reactions, markSeen, refetch: load };
}
