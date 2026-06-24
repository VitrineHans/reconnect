// Feature: react to a reveal — sendReaction logic + ReactionPicker component.

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

const mockCalls: { fn: string; table?: string; payload?: Record<string, unknown> }[] = [];
const mockSingle = jest.fn();
const mockInsert: { error: { message: string } | null } = { error: null };

jest.mock('../lib/supabase', () => ({
  supabase: {
    from: (table: string) => ({
      insert: (payload: Record<string, unknown>) => {
        mockCalls.push({ fn: 'insert', table, payload });
        return Promise.resolve(mockInsert);
      },
      select: () => ({ eq: () => ({ single: mockSingle }) }),
    }),
  },
}));

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { sendReaction } from '../hooks/useReactions';
import { ReactionPicker } from '../components/ReactionPicker';

const mockFetch = jest.fn();

describe('sendReaction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCalls.length = 0;
    mockInsert.error = null;
    mockSingle.mockResolvedValue({ data: { push_token: 'ExponentPushToken[x]' } });
    mockFetch.mockResolvedValue({ ok: true });
    (global as unknown as Record<string, unknown>).fetch = mockFetch;
  });

  it('inserts the reaction and pushes the friend', async () => {
    await sendReaction('f1', 'q1', 'me', 'friend', { emoji: '❤️' });
    const ins = mockCalls.find((c) => c.fn === 'insert');
    expect(ins?.table).toBe('reveal_reactions');
    expect(ins?.payload).toMatchObject({
      friendship_id: 'f1', question_id: 'q1', from_user: 'me', to_user: 'friend', emoji: '❤️',
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('is a no-op for an empty reaction', async () => {
    await sendReaction('f1', 'q1', 'me', 'friend', {});
    expect(mockCalls.some((c) => c.fn === 'insert')).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('trims the body and skips push when the friend has no token', async () => {
    mockSingle.mockResolvedValue({ data: { push_token: null } });
    await sendReaction('f1', 'q1', 'me', 'friend', { body: '  nice one  ' });
    const ins = mockCalls.find((c) => c.fn === 'insert');
    expect(ins?.payload?.body).toBe('nice one');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});

describe('ReactionPicker', () => {
  it('sends an emoji on tap', () => {
    const onSend = jest.fn();
    const { getByTestId } = render(<ReactionPicker onSend={onSend} onSkip={jest.fn()} />);
    fireEvent.press(getByTestId('reaction-emoji-❤️'));
    expect(onSend).toHaveBeenCalledWith({ emoji: '❤️' });
  });

  it('sends typed text via Send', () => {
    const onSend = jest.fn();
    const { getByPlaceholderText, getByText } = render(<ReactionPicker onSend={onSend} onSkip={jest.fn()} />);
    fireEvent.changeText(getByPlaceholderText('Add a quick reply…'), 'haha loved this');
    fireEvent.press(getByText('Send'));
    expect(onSend).toHaveBeenCalledWith({ body: 'haha loved this' });
  });

  it('calls onSkip when skipped', () => {
    const onSkip = jest.fn();
    const { getByText } = render(<ReactionPicker onSend={jest.fn()} onSkip={onSkip} />);
    fireEvent.press(getByText('Skip'));
    expect(onSkip).toHaveBeenCalled();
  });
});
