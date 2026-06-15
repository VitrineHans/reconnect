// Phase 5 — GroupCard component variants.

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GroupCard } from '../components/GroupCard';
import type { GroupWithState } from '../hooks/useGroups';

function makeGroup(over: Partial<GroupWithState> = {}): GroupWithState {
  return {
    id: 'g-1',
    name: 'Trip crew',
    createdBy: 'me',
    members: [
      { id: 'a', username: 'alice', display_name: null, avatar_url: null },
      { id: 'b', username: 'bob', display_name: null, avatar_url: null },
    ],
    questionText: 'What is your favourite movie?',
    currentQuestionId: 'q1',
    iAnswered: false,
    othersAnswered: 0,
    state: 'your_turn',
    ...over,
  };
}

describe('GroupCard', () => {
  it('renders the group name and member count', () => {
    const { getByText } = render(<GroupCard group={makeGroup()} onPress={jest.fn()} />);
    expect(getByText('Trip crew')).toBeTruthy();
    expect(getByText('2 members')).toBeTruthy();
  });

  it('shows the Record CTA when it is your turn', () => {
    const { getByText } = render(<GroupCard group={makeGroup({ state: 'your_turn' })} onPress={jest.fn()} />);
    expect(getByText('Record answer')).toBeTruthy();
  });

  it('shows the Watch CTA when the reveal is ready', () => {
    const { getByText } = render(<GroupCard group={makeGroup({ state: 'reveal_ready' })} onPress={jest.fn()} />);
    expect(getByText('Watch answers 👀')).toBeTruthy();
  });

  it('renders the question preview', () => {
    const { getByText } = render(<GroupCard group={makeGroup()} onPress={jest.fn()} />);
    expect(getByText('What is your favourite movie?')).toBeTruthy();
  });

  it('calls onPress with the group id', () => {
    const onPress = jest.fn();
    const { getByTestId } = render(<GroupCard group={makeGroup({ id: 'g-abc' })} onPress={onPress} />);
    fireEvent.press(getByTestId('group-card-g-abc'));
    expect(onPress).toHaveBeenCalledWith('g-abc');
  });
});
