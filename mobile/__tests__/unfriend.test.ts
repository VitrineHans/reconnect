// Phase 4 — unfriend (removeFriendship).

const mockFrom = jest.fn();
const mockDelete = jest.fn();
const mockEq = jest.fn();
const mockResult: { value: { error: { message: string } | null } } = { value: { error: null } };

jest.mock('../lib/supabase', () => {
  // Supabase query builders are thenable and chainable; this mock mimics enough
  // of .delete().eq()[.eq()] for removeFriendship and records the calls.
  const makeChain = () => {
    const chain = {
      eq: (column: string, value: unknown) => {
        mockEq(column, value);
        return chain;
      },
      then: (onFulfilled: (v: { error: { message: string } | null }) => unknown) =>
        Promise.resolve(mockResult.value).then(onFulfilled),
    };
    return chain;
  };
  return {
    supabase: {
      from: (table: string) => {
        mockFrom(table);
        return { delete: () => { mockDelete(table); return makeChain(); } };
      },
    },
  };
});

import { removeFriendship } from '../hooks/useFriendships';

describe('removeFriendship', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockResult.value = { error: null };
  });

  it('deletes the friendship by id and clears the sender-side invite', async () => {
    await removeFriendship('f-1', 'friend-id', 'my-id');

    expect(mockDelete).toHaveBeenCalledWith('friendships');
    expect(mockEq).toHaveBeenCalledWith('id', 'f-1');

    expect(mockDelete).toHaveBeenCalledWith('friend_invites');
    expect(mockEq).toHaveBeenCalledWith('from_user', 'my-id');
    expect(mockEq).toHaveBeenCalledWith('to_user', 'friend-id');
  });

  it('throws when the friendship delete fails and skips invite cleanup', async () => {
    mockResult.value = { error: { message: 'RLS denied' } };

    await expect(removeFriendship('f-1', 'friend-id', 'my-id')).rejects.toThrow('RLS denied');

    // friendships delete attempted, but friend_invites cleanup never reached
    expect(mockDelete).toHaveBeenCalledWith('friendships');
    expect(mockDelete).not.toHaveBeenCalledWith('friend_invites');
  });
});
