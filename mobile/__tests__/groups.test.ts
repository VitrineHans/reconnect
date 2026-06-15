// Phase 5 — group data layer (useGroups helpers).

const mockCalls: { fn: string; args: unknown[] }[] = [];
const mockState: {
  error: { message: string; code?: string } | null;
  count: number;
  singleData: unknown;
} = { error: null, count: 0, singleData: { id: 'g1' } };

jest.mock('../lib/supabase', () => {
  // A chainable, thenable query-builder stub (no PromiseLike type — the jest
  // hoist plugin rejects type references inside the factory).
  const make = () => {
    const c = {
      insert: (...a: unknown[]) => { mockCalls.push({ fn: 'insert', args: a }); return c; },
      select: (...a: unknown[]) => { mockCalls.push({ fn: 'select', args: a }); return c; },
      delete: (...a: unknown[]) => { mockCalls.push({ fn: 'delete', args: a }); return c; },
      eq: (...a: unknown[]) => { mockCalls.push({ fn: 'eq', args: a }); return c; },
      single: () => Promise.resolve({ data: mockState.singleData, error: mockState.error }),
      then: (onFulfilled: (v: { error: unknown; count: number }) => unknown) =>
        Promise.resolve({ error: mockState.error, count: mockState.count }).then(onFulfilled),
    };
    return c;
  };
  return {
    supabase: {
      from: (t: string) => { mockCalls.push({ fn: 'from', args: [t] }); return make(); },
      rpc: (...a: unknown[]) => { mockCalls.push({ fn: 'rpc', args: a }); return Promise.resolve({ error: null }); },
    },
  };
});

import {
  deriveGroupState,
  createGroup,
  inviteToGroup,
  leaveGroup,
  MAX_GROUP_MEMBERS,
} from '../hooks/useGroups';

const tables = () => mockCalls.filter((c) => c.fn === 'from').map((c) => c.args[0]);

describe('deriveGroupState', () => {
  it('waits when no question is assigned yet', () => {
    expect(deriveGroupState(false, false, 0)).toBe('waiting');
  });
  it('is your_turn until you answer', () => {
    expect(deriveGroupState(true, false, 3)).toBe('your_turn');
  });
  it('is reveal_ready once you have answered and others have too', () => {
    expect(deriveGroupState(true, true, 1)).toBe('reveal_ready');
  });
  it('waits when you have answered but nobody else has', () => {
    expect(deriveGroupState(true, true, 0)).toBe('waiting');
  });
});

describe('group mutations', () => {
  beforeEach(() => {
    mockCalls.length = 0;
    mockState.error = null;
    mockState.count = 0;
    mockState.singleData = { id: 'g1' };
  });

  it('createGroup inserts the group + creator member, then rotates', async () => {
    const id = await createGroup('Trip crew', 'me');
    expect(id).toBe('g1');
    expect(tables()).toEqual(['groups', 'group_members']);
    expect(mockCalls.some((c) => c.fn === 'rpc' && c.args[0] === 'rotate_group_questions')).toBe(true);
  });

  it('inviteToGroup throws when the group is already full', async () => {
    mockState.count = MAX_GROUP_MEMBERS;
    await expect(inviteToGroup('g1', 'friend')).rejects.toThrow(/full/i);
    // no insert attempted after the full check
    expect(mockCalls.some((c) => c.fn === 'insert')).toBe(false);
  });

  it('inviteToGroup adds the member when there is room', async () => {
    mockState.count = 2;
    await inviteToGroup('g1', 'friend');
    expect(mockCalls.some((c) => c.fn === 'insert')).toBe(true);
  });

  it('inviteToGroup ignores a duplicate-member (23505) error', async () => {
    mockState.count = 2;
    mockState.error = { message: 'dup', code: '23505' };
    await expect(inviteToGroup('g1', 'friend')).resolves.toBeUndefined();
  });

  it('leaveGroup deletes the membership row', async () => {
    await leaveGroup('g1', 'me');
    expect(mockCalls.some((c) => c.fn === 'delete')).toBe(true);
    expect(tables()).toEqual(['group_members']);
  });
});
