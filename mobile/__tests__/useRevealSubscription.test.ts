// Covers REVEAL-03: Realtime subscription detects both-submitted without polling

import { renderHook, act } from '@testing-library/react-native';

// Track call order for .on() vs .subscribe()
const callOrder: string[] = [];

type MockChannel = {
  on: jest.Mock;
  subscribe: jest.Mock;
};

// Declared with explicit type to break circular inference
const mockChannel: MockChannel = {
  on: jest.fn((_event: string, _opts: unknown, _cb: unknown): MockChannel => {
    callOrder.push('on');
    return mockChannel;
  }),
  subscribe: jest.fn((): MockChannel => {
    callOrder.push('subscribe');
    return mockChannel;
  }),
};

const mockRemoveChannel = jest.fn();
const mockChannel$ = jest.fn().mockReturnValue(mockChannel);

// DB re-query mock
const mockSecondEq = jest.fn();
const mockFirstEq = jest.fn().mockReturnValue({ eq: mockSecondEq });
const mockSelect = jest.fn().mockReturnValue({ eq: mockFirstEq });
const mockFrom = jest.fn().mockReturnValue({ select: mockSelect });

jest.mock('../lib/supabase', () => ({
  supabase: {
    get channel() {
      return mockChannel$;
    },
    get removeChannel() {
      return mockRemoveChannel;
    },
    get from() {
      return mockFrom;
    },
  },
}));

function setupQueryResult(data: { user_id: string }[]) {
  mockSecondEq.mockResolvedValue({ data, error: null });
}

import { useRevealSubscription } from '../hooks/useRevealSubscription';

describe('useRevealSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    callOrder.length = 0;
    mockChannel.on.mockImplementation((_event: string, _opts: unknown, _cb: unknown): MockChannel => {
      callOrder.push('on');
      return mockChannel;
    });
    mockChannel.subscribe.mockImplementation((): MockChannel => {
      callOrder.push('subscribe');
      return mockChannel;
    });
    mockChannel$.mockReturnValue(mockChannel);
    mockFrom.mockReturnValue({ select: mockSelect });
    mockSelect.mockReturnValue({ eq: mockFirstEq });
    mockFirstEq.mockReturnValue({ eq: mockSecondEq });
  });

  it('revealReady is false initially', () => {
    setupQueryResult([]);
    const { result } = renderHook(() =>
      useRevealSubscription({ friendshipId: 'f-1', questionId: 'q-1', enabled: true }),
    );
    expect(result.current.revealReady).toBe(false);
  });

  it('revealReady stays false when DB returns count=1', async () => {
    setupQueryResult([{ user_id: 'user-a' }]);

    let insertCallback: ((payload: unknown) => void) | undefined;
    mockChannel.on.mockImplementation((_event: string, _opts: unknown, cb: unknown): MockChannel => {
      callOrder.push('on');
      insertCallback = cb as (payload: unknown) => void;
      return mockChannel;
    });

    const { result } = renderHook(() =>
      useRevealSubscription({ friendshipId: 'f-1', questionId: 'q-1', enabled: true }),
    );

    await act(async () => {
      insertCallback?.({});
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.revealReady).toBe(false);
  });

  it('revealReady becomes true when DB returns count=2', async () => {
    setupQueryResult([{ user_id: 'user-a' }, { user_id: 'user-b' }]);

    let insertCallback: ((payload: unknown) => void) | undefined;
    mockChannel.on.mockImplementation((_event: string, _opts: unknown, cb: unknown): MockChannel => {
      callOrder.push('on');
      insertCallback = cb as (payload: unknown) => void;
      return mockChannel;
    });

    const { result } = renderHook(() =>
      useRevealSubscription({ friendshipId: 'f-1', questionId: 'q-1', enabled: true }),
    );

    await act(async () => {
      insertCallback?.({});
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.revealReady).toBe(true);
  });

  it('supabase.removeChannel is called on unmount', () => {
    setupQueryResult([]);
    const { unmount } = renderHook(() =>
      useRevealSubscription({ friendshipId: 'f-1', questionId: 'q-1', enabled: true }),
    );
    unmount();
    expect(mockRemoveChannel).toHaveBeenCalledWith(mockChannel);
  });

  it('.on() is registered before .subscribe()', () => {
    setupQueryResult([]);
    renderHook(() =>
      useRevealSubscription({ friendshipId: 'f-1', questionId: 'q-1', enabled: true }),
    );
    expect(callOrder[0]).toBe('on');
    expect(callOrder[1]).toBe('subscribe');
  });

  it('does not subscribe when enabled=false', () => {
    setupQueryResult([]);
    renderHook(() =>
      useRevealSubscription({ friendshipId: 'f-1', questionId: 'q-1', enabled: false }),
    );
    expect(mockChannel$).not.toHaveBeenCalled();
  });
});
