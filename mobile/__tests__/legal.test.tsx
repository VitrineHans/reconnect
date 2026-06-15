// Phase 4 — Privacy / Terms legal screens.

import React from 'react';
import { render } from '@testing-library/react-native';
import en from '../locales/en.json';

let mockDoc = 'privacy';
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ doc: mockDoc }),
  useRouter: () => ({ back: jest.fn() }),
}));

import LegalScreen from '../app/legal/[doc]';

describe('LegalScreen', () => {
  it('renders the privacy policy with the draft notice', () => {
    mockDoc = 'privacy';
    const { getByText } = render(<LegalScreen />);
    expect(getByText(en.legal.privacyTitle)).toBeTruthy();
    expect(getByText(en.legal.draftNotice)).toBeTruthy();
    expect(getByText(en.legal.privacyBody)).toBeTruthy();
  });

  it('renders the terms of service for the terms doc', () => {
    mockDoc = 'terms';
    const { getByText } = render(<LegalScreen />);
    expect(getByText(en.legal.termsTitle)).toBeTruthy();
    expect(getByText(en.legal.termsBody)).toBeTruthy();
  });
});
