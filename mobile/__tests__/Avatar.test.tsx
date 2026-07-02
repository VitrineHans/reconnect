// Covers the shared cached Avatar + group AvatarStack facepile

import React from 'react';
import { render } from '@testing-library/react-native';
import { Avatar, AvatarStack } from '../components/Avatar';

describe('Avatar', () => {
  it('renders initials when there is no photo', () => {
    const { getByText } = render(<Avatar name="Alice Baker" url={null} />);
    expect(getByText('AB')).toBeTruthy();
  });

  it('renders a single initial for a one-word name', () => {
    const { getByText } = render(<Avatar name="alice" />);
    expect(getByText('A')).toBeTruthy();
  });

  it('renders an image (no initials) when a url is set', () => {
    const { queryByText, getByLabelText } = render(
      <Avatar name="Alice" url="https://example.com/a.jpg" />,
    );
    expect(queryByText('A')).toBeNull();
    expect(getByLabelText('Alice')).toBeTruthy();
  });
});

describe('AvatarStack', () => {
  const members = [
    { id: '1', name: 'Alice', url: null },
    { id: '2', name: 'Bob', url: null },
    { id: '3', name: 'Cara', url: null },
    { id: '4', name: 'Dan', url: null },
    { id: '5', name: 'Eve', url: null },
  ];

  it('shows at most `max` avatars plus an overflow count', () => {
    const { getByText, queryByText } = render(<AvatarStack members={members} max={3} />);
    expect(getByText('A')).toBeTruthy();
    expect(getByText('B')).toBeTruthy();
    expect(getByText('C')).toBeTruthy();
    expect(queryByText('D')).toBeNull();
    expect(getByText('+2')).toBeTruthy();
  });

  it('shows no overflow badge when everyone fits', () => {
    const { queryByText } = render(<AvatarStack members={members.slice(0, 2)} max={3} />);
    expect(queryByText(/^\+/)).toBeNull();
  });
});
