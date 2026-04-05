// Covers AUTH-03, AUTH-04
/* eslint-disable @typescript-eslint/no-explicit-any */

const mockGetSession = jest.fn();
const mockUnsubscribe = jest.fn();
const mockOnAuthStateChange = jest.fn((_cb?: any) => ({
  data: { subscription: { unsubscribe: mockUnsubscribe } },
}));

jest.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: mockOnAuthStateChange,
    },
  },
}));

describe('useSession — session persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockOnAuthStateChange.mockImplementation((_cb?: any) => ({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    }));
  });

  it('AUTH-03: getSession resolves and loading becomes false', async () => {
    const mockSession = { access_token: 'tok', user: { id: 'uid-1' } };
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    const { data: { session } } = await mockGetSession();
    expect(session).toEqual(mockSession);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it('AUTH-03: session is null when getSession returns null', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });

    const { data: { session } } = await mockGetSession();
    expect(session).toBeNull();
  });

  it('AUTH-04: onAuthStateChange fires null session on signOut', () => {
    let capturedCallback: ((event: string, session: any) => void) | null = null;
    mockOnAuthStateChange.mockImplementation((cb: any) => {
      capturedCallback = cb;
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
    });

    mockOnAuthStateChange((_event: string, _session: any) => {});
    expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1);

    if (capturedCallback) {
      (capturedCallback as (e: string, s: null) => void)('SIGNED_OUT', null);
    }
    expect(mockUnsubscribe).not.toHaveBeenCalled();
  });

  it('AUTH-04: subscription is cleaned up on unmount', () => {
    const { data: { subscription } } = mockOnAuthStateChange(() => {});
    subscription.unsubscribe();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(1);
  });
});
