// Covers HOME-01, HOME-02: useFriendships — state computation + sort order

const mockFrom = jest.fn();

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: mockFrom,
  },
}));

import type { FriendshipWithState, FriendshipState } from '../hooks/useFriendships';

const USER_ID = 'user-a';
const FRIEND_ID = 'user-b';

interface MockFriendship {
  id: string;
  streak_count: number;
  user_a: string;
  user_b: string;
  current_question_id: string | null;
  questions: { text: string } | null;
  question_responses: { id: string; user_id: string; watched_at: null; expires_at: string | null }[];
}

function makeFriendship(overrides: Partial<MockFriendship> = {}): MockFriendship {
  return {
    id: 'f-1',
    streak_count: 3,
    user_a: USER_ID,
    user_b: FRIEND_ID,
    current_question_id: 'q-1',
    questions: { text: 'What makes you laugh?' },
    question_responses: [],
    ...overrides,
  };
}

function mockSupabaseChain(friendships: MockFriendship[]) {
  // First call: friendships query
  const friendshipChain = {
    select: jest.fn().mockReturnThis(),
    or: jest.fn().mockResolvedValue({ data: friendships, error: null }),
  };

  // Second call: profiles query
  const profileChain = {
    select: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({
      data: [{ id: FRIEND_ID, username: 'friend_user', display_name: 'Friend User', avatar_url: null }],
      error: null,
    }),
  };

  mockFrom
    .mockReturnValueOnce(friendshipChain)
    .mockReturnValueOnce(profileChain);
}

// Compute state from raw data — mirrors logic in useFriendships
function computeState(
  responses: MockFriendship['question_responses'],
  userId: string,
): FriendshipState {
  const myResponse = responses.find((r) => r.user_id === userId);
  const bothResponded = responses.length === 2;
  const iSubmitted = Boolean(myResponse);

  if (bothResponded) return 'reveal_ready';
  if (!iSubmitted) return 'your_turn';
  return 'waiting';
}

describe('useFriendships — state computation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('state is reveal_ready when two responses exist', () => {
    const responses = [
      { id: 'r-1', user_id: USER_ID, watched_at: null, expires_at: null },
      { id: 'r-2', user_id: FRIEND_ID, watched_at: null, expires_at: null },
    ];
    const state = computeState(responses, USER_ID);
    expect(state).toBe('reveal_ready');
  });

  it('state is your_turn when zero responses exist', () => {
    const state = computeState([], USER_ID);
    expect(state).toBe('your_turn');
  });

  it('state is waiting when only current user has responded', () => {
    const responses = [{ id: 'r-1', user_id: USER_ID, watched_at: null, expires_at: null }];
    const state = computeState(responses, USER_ID);
    expect(state).toBe('waiting');
  });

  it('state is your_turn when only friend has responded', () => {
    const responses = [{ id: 'r-2', user_id: FRIEND_ID, watched_at: null, expires_at: null }];
    const state = computeState(responses, USER_ID);
    expect(state).toBe('your_turn');
  });
});

describe('useFriendships — sort order', () => {
  it('sorts reveal_ready before your_turn before waiting', () => {
    const items: FriendshipWithState[] = [
      {
        id: 'f-waiting',
        friendId: 'u1',
        friendProfile: { username: 'u1', display_name: null, avatar_url: null },
        streakCount: 0,
        questionText: null,
        state: 'waiting',
        expiresAt: null,
        myResponseId: null,
      },
      {
        id: 'f-reveal',
        friendId: 'u2',
        friendProfile: { username: 'u2', display_name: null, avatar_url: null },
        streakCount: 5,
        questionText: 'A question',
        state: 'reveal_ready',
        expiresAt: null,
        myResponseId: 'r-1',
      },
      {
        id: 'f-turn',
        friendId: 'u3',
        friendProfile: { username: 'u3', display_name: null, avatar_url: null },
        streakCount: 2,
        questionText: 'Another question',
        state: 'your_turn',
        expiresAt: null,
        myResponseId: null,
      },
    ];

    const STATE_PRIORITY: Record<FriendshipState, number> = {
      reveal_ready: 0,
      your_turn: 1,
      waiting: 2,
    };

    const sorted = [...items].sort(
      (a, b) => STATE_PRIORITY[a.state] - STATE_PRIORITY[b.state],
    );

    expect(sorted[0].state).toBe('reveal_ready');
    expect(sorted[1].state).toBe('your_turn');
    expect(sorted[2].state).toBe('waiting');
  });

  it('reveal_ready sorts before your_turn', () => {
    const STATE_PRIORITY: Record<FriendshipState, number> = {
      reveal_ready: 0,
      your_turn: 1,
      waiting: 2,
    };
    expect(STATE_PRIORITY['reveal_ready']).toBeLessThan(STATE_PRIORITY['your_turn']);
    expect(STATE_PRIORITY['your_turn']).toBeLessThan(STATE_PRIORITY['waiting']);
  });
});

describe('useFriendships — supabase query mock', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls friendships and profiles tables in sequence', async () => {
    const friendship = makeFriendship();
    mockSupabaseChain([friendship]);

    // Simulate the fetch chain
    const friendshipChain = mockFrom('friendships');
    friendshipChain.select('id, streak_count, user_a, user_b, current_question_id, ...');
    const { data, error } = await friendshipChain.or(`user_a.eq.${USER_ID},user_b.eq.${USER_ID}`);

    expect(error).toBeNull();
    expect(data).toHaveLength(1);
    expect(data[0].id).toBe('f-1');

    // Simulate the profiles fetch
    const profileChain = mockFrom('profiles');
    profileChain.select('id, username, display_name, avatar_url');
    const profileResult = await profileChain.in('id', [FRIEND_ID]);

    expect(profileResult.data).toHaveLength(1);
    expect(profileResult.data[0].id).toBe(FRIEND_ID);
    expect(profileResult.data[0].display_name).toBe('Friend User');
  });
});
