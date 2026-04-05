// TODO Phase 3: wire to DB trigger on both-submitted event
// This Edge Function is a stub — it will be triggered by a PostgreSQL function
// when both friends have submitted their question_responses for a given friendship.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

interface NotifyRevealBody {
  friendshipId: string;
  userId: string;
}

interface PushPayload {
  to: string;
  title: string;
  body: string;
  data: { friendshipId: string };
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const supabaseUrl = Deno.env.get('SUPABASE_URL');

  if (!serviceRoleKey || !supabaseUrl) {
    return new Response('Missing environment variables', { status: 500 });
  }

  const body: NotifyRevealBody = await req.json();
  const { friendshipId, userId } = body;

  if (!friendshipId || !userId) {
    return new Response('Missing friendshipId or userId', { status: 400 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: friendship } = await adminClient
    .from('friendships')
    .select('user_a, user_b')
    .eq('id', friendshipId)
    .single();

  if (!friendship) {
    return new Response('Friendship not found', { status: 404 });
  }

  const friendId = friendship.user_a === userId ? friendship.user_b : friendship.user_a;

  const { data: profile } = await adminClient
    .from('profiles')
    .select('push_token')
    .eq('id', friendId)
    .single();

  const pushToken = (profile as { push_token?: string } | null)?.push_token;

  if (!pushToken) {
    return new Response('No push token for friend', { status: 200 });
  }

  const pushPayload: PushPayload = {
    to: pushToken,
    title: 'Reconnect',
    body: 'Your friend answered \uD83D\uDC40',
    data: { friendshipId },
  };

  const pushRes = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(pushPayload),
  });

  if (!pushRes.ok) {
    return new Response('Push notification failed', { status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
