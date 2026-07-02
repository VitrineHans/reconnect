// Phase 4 — Settings screen + visible language switcher.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
}));
jest.mock('../lib/supabase', () => ({
  supabase: { auth: { signOut: jest.fn() } },
}));
jest.mock('../hooks/useSession', () => ({ useSession: () => ({ session: null }) }));
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  SchedulableTriggerInputTypes: { DATE: 'date' },
}));

import SettingsScreen from '../app/settings';
import i18n, { setLanguage } from '../lib/i18n';

afterEach(async () => {
  await setLanguage('en');
});

describe('SettingsScreen', () => {
  it('renders the title and every supported language by native name', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Settings')).toBeTruthy();
    ['English', 'Nederlands', 'Español', 'Deutsch', 'Français'].forEach((name) => {
      expect(getByText(name)).toBeTruthy();
    });
  });

  it('switches the active language when a language row is pressed', async () => {
    const { getByText } = render(<SettingsScreen />);
    expect(i18n.language).toBe('en');
    fireEvent.press(getByText('Nederlands'));
    await waitFor(() => expect(i18n.language).toBe('nl'));
  });

  it('exposes the account actions (edit answers + sign out)', () => {
    const { getByText } = render(<SettingsScreen />);
    expect(getByText('Account')).toBeTruthy();
    expect(getByText('Edit your answers')).toBeTruthy();
    expect(getByText('Sign out')).toBeTruthy();
  });

  it('hosts the personal-profile editing section (photo + display name)', () => {
    const { getByText, getByLabelText } = render(<SettingsScreen />);
    expect(getByText('Change photo')).toBeTruthy();
    expect(getByLabelText('Display name')).toBeTruthy();
    expect(getByText('Username')).toBeTruthy();
  });

  it('back always lands on the Profile page', () => {
    mockReplace.mockClear();
    const { getByLabelText } = render(<SettingsScreen />);
    fireEvent.press(getByLabelText('Back'));
    expect(mockReplace).toHaveBeenCalledWith('/(tabs)/profile');
  });
});
