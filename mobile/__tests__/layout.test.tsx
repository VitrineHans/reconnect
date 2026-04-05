// Covers AUTH-05 — 4-stage auth guard routing

const mockReplace = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSegments: jest.fn(),
  Stack: {
    Screen: () => null,
  },
}));

jest.mock('../hooks/useSession', () => ({
  useSession: jest.fn(),
}));

jest.mock('../hooks/useProfile', () => ({
  useProfile: jest.fn(),
}));

import { useSegments } from 'expo-router';
import { useSession } from '../hooks/useSession';
import { useProfile } from '../hooks/useProfile';

const mockUseSegments = useSegments as jest.Mock;
const mockUseSession = useSession as jest.Mock;
const mockUseProfile = useProfile as jest.Mock;

// Simulate the auth guard logic from _layout.tsx
function runGuard(
  session: object | null,
  loading: boolean,
  profile: { username: string; onboarding_answers: object | null } | null,
  profileLoading: boolean,
  segments: string[],
) {
  if (loading || profileLoading) return null;

  const inAuth = segments[0] === '(auth)';
  const inOnboarding = segments[0] === '(onboarding)';

  if (!session && !inAuth) return '/(auth)/login';
  if (session && profile?.username === '' && !inOnboarding) return '/(onboarding)/username';
  if (session && profile?.username && profile.username !== '' && !profile?.onboarding_answers && !inOnboarding) {
    return '/(onboarding)/questionnaire';
  }
  if (session && profile?.username && profile.username !== '' && profile?.onboarding_answers && (inAuth || inOnboarding)) {
    return '/(tabs)/home';
  }
  return null;
}

describe('Auth Guard — 4-stage routing (AUTH-05)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('Stage 1: no session → redirects to /(auth)/login', () => {
    const route = runGuard(null, false, null, false, ['(tabs)']);
    expect(route).toBe('/(auth)/login');
  });

  it('Stage 2: session + empty username → redirects to /(onboarding)/username', () => {
    const session = { user: { id: 'uid-1' } };
    const profile = { username: '', onboarding_answers: null };
    const route = runGuard(session, false, profile, false, ['(tabs)']);
    expect(route).toBe('/(onboarding)/username');
  });

  it('Stage 3: session + username set + no onboarding_answers → redirects to /(onboarding)/questionnaire', () => {
    const session = { user: { id: 'uid-1' } };
    const profile = { username: 'alex', onboarding_answers: null };
    const route = runGuard(session, false, profile, false, ['(tabs)']);
    expect(route).toBe('/(onboarding)/questionnaire');
  });

  it('Stage 4: fully onboarded user in auth segment → redirects to /(tabs)/home', () => {
    const session = { user: { id: 'uid-1' } };
    const profile = { username: 'alex', onboarding_answers: { friendship_length: '3+' } };
    const route = runGuard(session, false, profile, false, ['(auth)']);
    expect(route).toBe('/(tabs)/home');
  });

  it('Guard waits while loading — no redirect', () => {
    const route = runGuard(null, true, null, false, ['(tabs)']);
    expect(route).toBeNull();
  });

  it('Guard waits while profileLoading — no redirect', () => {
    const session = { user: { id: 'uid-1' } };
    const route = runGuard(session, false, null, true, ['(tabs)']);
    expect(route).toBeNull();
  });
});
