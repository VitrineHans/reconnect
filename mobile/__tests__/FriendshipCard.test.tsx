// Covers HOME-02, HOME-03, HOME-04: FriendshipCard component variants

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { FriendshipCard } from '../components/FriendshipCard';
import type { FriendshipWithState } from '../hooks/useFriendships';

function makeFriendship(overrides: Partial<FriendshipWithState> = {}): FriendshipWithState {
  return {
    id: 'f-1',
    friendId: 'user-b',
    friendProfile: { username: 'alice', display_name: 'Alice', avatar_url: null },
    streakCount: 3,
    questionText: 'What is your favourite movie?',
    state: 'your_turn',
    expiresAt: null,
    myResponseId: null,
    ...overrides,
  };
}

describe('FriendshipCard', () => {
  it('renders "Watch Now" CTA for reveal_ready state', () => {
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship({ state: 'reveal_ready' })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Watch Now 👀')).toBeTruthy();
  });

  it('renders "Record Answer" CTA for your_turn state', () => {
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship({ state: 'your_turn' })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Record Answer')).toBeTruthy();
  });

  it('renders "Waiting for Alice..." CTA for waiting state', () => {
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship({ state: 'waiting' })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Waiting for Alice...')).toBeTruthy();
  });

  it('renders streak badge with fire emoji', () => {
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship({ streakCount: 5 })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('🔥 5')).toBeTruthy();
  });

  it('renders streak badge "🔥 0" when streakCount is 0', () => {
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship({ streakCount: 0 })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('🔥 0')).toBeTruthy();
  });

  it('renders friend display_name', () => {
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship()}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('Alice')).toBeTruthy();
  });

  it('falls back to username when display_name is null', () => {
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship({
          friendProfile: { username: 'alice_handle', display_name: null, avatar_url: null },
        })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('alice_handle')).toBeTruthy();
  });

  it('renders question text preview', () => {
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship()}
        onPress={jest.fn()}
      />,
    );
    expect(getByText('What is your favourite movie?')).toBeTruthy();
  });

  it('truncates long question text to 80 characters', () => {
    const longText = 'A'.repeat(100);
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship({ questionText: longText })}
        onPress={jest.fn()}
      />,
    );
    expect(getByText(`${'A'.repeat(80)}…`)).toBeTruthy();
  });

  it('calls onPress with friendship id when card is pressed', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(
      <FriendshipCard
        friendship={makeFriendship({ id: 'f-abc' })}
        onPress={onPress}
      />,
    );
    fireEvent.press(getByTestId('friendship-card-f-abc'));
    expect(onPress).toHaveBeenCalledWith('f-abc');
  });

  it('renders countdown text when expiresAt is provided for your_turn', () => {
    const future = new Date(Date.now() + 5 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString();
    const { getByText } = render(
      <FriendshipCard
        friendship={makeFriendship({ state: 'your_turn', expiresAt: future })}
        onPress={jest.fn()}
      />,
    );
    // Should render something like "5h 30m left"
    expect(getByText(/\d+h \d+m left/)).toBeTruthy();
  });
});
