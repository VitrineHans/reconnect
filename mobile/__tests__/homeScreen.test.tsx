// Home = ONE feed of friendship + group cards; group-fetch failures must be
// visible (error banner), never silently drop cards from the feed.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import type { FriendshipWithState } from '../hooks/useFriendships';
import type { GroupWithState } from '../hooks/useGroups';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: jest.fn(), replace: jest.fn() }),
  useFocusEffect: (cb: () => void) => { /* focus effects don't run under test */ },
}));
jest.mock('../hooks/useSession', () => ({
  useSession: () => ({ session: { user: { id: 'uid-1' } } }),
}));

const mockUseFriendships = jest.fn();
jest.mock('../hooks/useFriendships', () => ({
  useFriendships: (userId: string | null) => mockUseFriendships(userId),
}));
const mockUseGroups = jest.fn();
jest.mock('../hooks/useGroups', () => ({
  useGroups: (userId: string | null) => mockUseGroups(userId),
}));
jest.mock('../hooks/useReactions', () => ({
  useUnseenReactions: () => ({ reactions: [], markSeen: jest.fn(), refetch: jest.fn() }),
}));

// eslint-disable-next-line import/first -- must import after the jest.mock calls above
import HomeScreen from '../app/(tabs)/home';

function friendship(over: Partial<FriendshipWithState> = {}): FriendshipWithState {
  return {
    id: 'f-1',
    friendId: 'u-2',
    friendProfile: { username: 'otto', display_name: 'Otto', avatar_url: null },
    streakCount: 2,
    questionText: 'Friend question?',
    state: 'waiting',
    expiresAt: null,
    myResponseId: null,
    currentQuestionId: null,
    ...over,
  };
}

function group(over: Partial<GroupWithState> = {}): GroupWithState {
  return {
    id: 'g-1',
    name: 'Trip crew',
    createdBy: 'uid-1',
    members: [{ id: 'a', username: 'alice', display_name: null, avatar_url: null }],
    questionText: 'Group question?',
    currentQuestionId: 'q1',
    iAnswered: false,
    othersAnswered: 0,
    state: 'your_turn',
    ...over,
  };
}

function friendshipsResult(items: FriendshipWithState[], extra = {}) {
  return { friendships: items, loading: false, error: null, refetch: jest.fn(), ...extra };
}
function groupsResult(items: GroupWithState[], extra = {}) {
  return { groups: items, loading: false, error: null, refetch: jest.fn(), ...extra };
}

describe('HomeScreen feed', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders friendship and group cards in one feed', () => {
    mockUseFriendships.mockReturnValue(friendshipsResult([friendship()]));
    mockUseGroups.mockReturnValue(groupsResult([group()]));
    const { getByText, getByTestId } = render(<HomeScreen />);
    expect(getByText('Otto')).toBeTruthy();
    expect(getByText('Friend question?')).toBeTruthy();
    expect(getByTestId('group-card-g-1')).toBeTruthy();
    expect(getByText('Group question?')).toBeTruthy();
  });

  it('opens a group with from=home so leave-group is suppressed there', () => {
    mockUseFriendships.mockReturnValue(friendshipsResult([]));
    mockUseGroups.mockReturnValue(groupsResult([group()]));
    const { getByTestId } = render(<HomeScreen />);
    fireEvent.press(getByTestId('group-card-g-1'));
    expect(mockPush).toHaveBeenCalledWith('/group/g-1?from=home');
  });

  it('shows a visible error banner when groups fail — friendships still render', () => {
    mockUseFriendships.mockReturnValue(friendshipsResult([friendship()]));
    const refetch = jest.fn();
    mockUseGroups.mockReturnValue(groupsResult([], { error: 'column question_responses.group_id does not exist', refetch }));
    const { getByText, getByTestId } = render(<HomeScreen />);
    expect(getByText('Otto')).toBeTruthy(); // feed not blanked
    fireEvent.press(getByTestId('groups-error-banner'));
    expect(refetch).toHaveBeenCalled();
  });

  it('shows the empty state only when both sources are loaded and empty', () => {
    mockUseFriendships.mockReturnValue(friendshipsResult([]));
    mockUseGroups.mockReturnValue(groupsResult([]));
    const { getByText } = render(<HomeScreen />);
    expect(getByText(/No friendships yet/)).toBeTruthy();
  });
});
