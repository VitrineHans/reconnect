import { useEffect, useRef, useState } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface UseRevealSubscriptionParams {
  friendshipId: string;
  questionId: string;
  enabled: boolean;
}

interface UseRevealSubscriptionResult {
  revealReady: boolean;
}

async function checkBothSubmitted(friendshipId: string, questionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('question_responses')
    .select('user_id')
    .eq('friendship_id', friendshipId)
    .eq('question_id', questionId);

  if (error) return false;
  return (data?.length ?? 0) === 2;
}

export function useRevealSubscription({
  friendshipId,
  questionId,
  enabled,
}: UseRevealSubscriptionParams): UseRevealSubscriptionResult {
  const [revealReady, setRevealReady] = useState(false);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const channel = supabase
      .channel(`responses:${friendshipId}:${questionId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'question_responses',
          filter: `friendship_id=eq.${friendshipId}`,
        },
        async (_payload) => {
          const bothSubmitted = await checkBothSubmitted(friendshipId, questionId);
          if (bothSubmitted) setRevealReady(true);
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [friendshipId, questionId, enabled]);

  return { revealReady };
}
