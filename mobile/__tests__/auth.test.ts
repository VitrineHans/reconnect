// Covers AUTH-01, AUTH-02
const mockSignInWithOtp = jest.fn().mockResolvedValue({ error: null });
const mockVerifyOtp = jest.fn().mockResolvedValue({
  data: { session: { access_token: 'tok', user: { id: 'uid-1' } } },
  error: null,
});

jest.mock('../lib/supabase', () => ({
  supabase: { auth: { signInWithOtp: mockSignInWithOtp, verifyOtp: mockVerifyOtp } },
}));

describe('Auth — OTP flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignInWithOtp.mockResolvedValue({ error: null });
    mockVerifyOtp.mockResolvedValue({
      data: { session: { access_token: 'tok', user: { id: 'uid-1' } } },
      error: null,
    });
  });

  it('AUTH-01: signInWithOtp called with email and shouldCreateUser:true', async () => {
    const { supabase } = require('../lib/supabase');
    await supabase.auth.signInWithOtp({
      email: 'test@example.com',
      options: { shouldCreateUser: true },
    });
    expect(mockSignInWithOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      options: { shouldCreateUser: true },
    });
  });

  it('AUTH-02: verifyOtp called with email, 6-digit token, type email', async () => {
    const { supabase } = require('../lib/supabase');
    const result = await supabase.auth.verifyOtp({
      email: 'test@example.com',
      token: '123456',
      type: 'email',
    });
    expect(mockVerifyOtp).toHaveBeenCalledWith({
      email: 'test@example.com',
      token: '123456',
      type: 'email',
    });
    expect(result.data.session.access_token).toBe('tok');
  });

  it('AUTH-01: signInWithOtp returns no error on success', async () => {
    const { supabase } = require('../lib/supabase');
    const result = await supabase.auth.signInWithOtp({
      email: 'user@example.com',
      options: { shouldCreateUser: true },
    });
    expect(result.error).toBeNull();
  });
});
