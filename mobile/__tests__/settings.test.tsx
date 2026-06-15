// Phase 4 — Settings screen + visible language switcher.

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn() }),
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
});
