// Profile page is a display + engagement surface: streak hero, real stats,
// achievements, invite hook — and NO edit affordances (those live in Settings).

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { ProfileStats } from '../lib/stats';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
}));
jest.mock('../hooks/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'uid-1' } } }),
}));
jest.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: { id: 'uid-1', username: 'alex', display_name: 'Alex', avatar_url: null },
    profileLoading: false,
    refetch: jest.fn(),
  }),
}));

const mockUseStats = jest.fn();
jest.mock('../hooks/useStats', () => ({
  useStats: (userId: string | null) => mockUseStats(userId),
}));

// eslint-disable-next-line import/first -- must import after the jest.mock calls above
import ProfileScreen from '../app/(tabs)/profile';

function statsResult(stats: Partial<ProfileStats>, extra: Record<string, unknown> = {}) {
  return {
    stats: {
      currentStreak: 0,
      longestStreak: 0,
      totalAnswers: 0,
      friendsCount: 0,
      groupsCount: 0,
      memberSince: '2026-01-15T00:00:00Z',
      ...stats,
    },
    loading: false,
    error: null,
    refetch: jest.fn(),
    ...extra,
  };
}

describe('ProfileScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows identity and an empty-state streak hero for a new user', () => {
    mockUseStats.mockReturnValue(statsResult({}));
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('Alex')).toBeTruthy();
    expect(getByText('@alex')).toBeTruthy();
    expect(getByText('Start your first streak 🔥')).toBeTruthy();
  });

  it('shows the current streak and longest streak when active', () => {
    mockUseStats.mockReturnValue(statsResult({ currentStreak: 6, longestStreak: 11 }));
    const { getByText, queryByText } = render(<ProfileScreen />);
    expect(getByText('6')).toBeTruthy();
    expect(getByText('Longest: 11 days')).toBeTruthy();
    expect(queryByText('Start your first streak 🔥')).toBeNull();
  });

  it('renders the real-data stats grid', () => {
    mockUseStats.mockReturnValue(statsResult({ totalAnswers: 42, friendsCount: 3, groupsCount: 1 }));
    const { getByText } = render(<ProfileScreen />);
    expect(getByText('42')).toBeTruthy();
    expect(getByText('Questions answered')).toBeTruthy();
    expect(getByText('3')).toBeTruthy();
    expect(getByText('Member since')).toBeTruthy();
  });

  it('renders achievements with locked and unlocked states', () => {
    mockUseStats.mockReturnValue(statsResult({ friendsCount: 1, longestStreak: 3 }));
    const { getByText, getAllByText } = render(<ProfileScreen />);
    expect(getByText('First friend')).toBeTruthy();   // unlocked
    expect(getByText('Unbreakable')).toBeTruthy();    // still visible…
    expect(getAllByText('🔒').length).toBeGreaterThan(0); // …but locked
  });

  it('has no edit affordances — editing lives in Settings', () => {
    mockUseStats.mockReturnValue(statsResult({}));
    const { queryByText, getByTestId } = render(<ProfileScreen />);
    expect(queryByText('Change photo')).toBeNull();
    expect(queryByText('Save')).toBeNull();
    // …but Settings stays reachable
    fireEvent.press(getByTestId('settings-button'));
    expect(mockPush).toHaveBeenCalledWith('/settings');
  });

  it('shows a retry link when stats fail to load', () => {
    const refetch = jest.fn();
    mockUseStats.mockReturnValue({ stats: null, loading: false, error: 'boom', refetch });
    const { getByText } = render(<ProfileScreen />);
    fireEvent.press(getByText(/Couldn't load your stats/));
    expect(refetch).toHaveBeenCalled();
  });
});
