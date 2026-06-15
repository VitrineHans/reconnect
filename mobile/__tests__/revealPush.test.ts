// Phase 3 — reveal push (REVEAL-02 / PUSH-04).
// Covers notifyFriendOfReveal: the second submitter's client notifying the
// friend that both answers are in.

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

// Minimal Supabase mock: every query resolves through .single(), so tests drive
// results with mockResolvedValueOnce in call order (friendship, then profile).
// eq() captures (table, value) so we can assert the correct friend was queried.
const mockSingle = jest.fn();
const mockEqArgs: { table: string; val: unknown }[] = [];

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      select: () => ({
        eq: (_col: string, val: unknown) => {
          mockEqArgs.push({ table, val });
          return { single: mockSingle };
        },
      }),
    }),
  },
}));

import { notifyFriendOfReveal } from '../hooks/useNotifications';

const mockFetch = jest.fn();

describe('notifyFriendOfReveal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSingle.mockReset();
    mockEqArgs.length = 0;
    mockFetch.mockResolvedValue({ ok: true, status: 200 });
    (global as unknown as Record<string, unknown>).fetch = mockFetch;
  });

  it('sends a reveal push to the friend with the reveal routing payload', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_a: 'me', user_b: 'friend' } })
      .mockResolvedValueOnce({ data: { push_token: 'ExponentPushToken[friend]' } });

    const sent = await notifyFriendOfReveal('f-1', 'me');

    expect(sent).toBe(true);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://exp.host/--/api/v2/push/send');
    const body = (init as { body: string }).body;
    expect(body).toContain('ExponentPushToken[friend]');
    expect(body).toContain('"screen":"reveal"');
    expect(body).toContain('f-1');
  });

  it('resolves the friend as the OTHER member regardless of a/b position', async () => {
    // current user is user_b → friend is user_a
    mockSingle
      .mockResolvedValueOnce({ data: { user_a: 'friend', user_b: 'me' } })
      .mockResolvedValueOnce({ data: { push_token: 'tok' } });

    await notifyFriendOfReveal('f-2', 'me');

    expect(mockEqArgs).toContainEqual({ table: 'profiles', val: 'friend' });
  });

  it('does not send when the friend has no push token', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_a: 'me', user_b: 'friend' } })
      .mockResolvedValueOnce({ data: { push_token: null } });

    const sent = await notifyFriendOfReveal('f-1', 'me');

    expect(sent).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('returns false and does not throw when the friendship is missing', async () => {
    mockSingle.mockResolvedValueOnce({ data: null });

    await expect(notifyFriendOfReveal('f-x', 'me')).resolves.toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('never throws if the push request fails', async () => {
    mockSingle
      .mockResolvedValueOnce({ data: { user_a: 'me', user_b: 'friend' } })
      .mockResolvedValueOnce({ data: { push_token: 'tok' } });
    mockFetch.mockRejectedValueOnce(new Error('network'));

    await expect(notifyFriendOfReveal('f-1', 'me')).resolves.toBe(true);
  });
});
