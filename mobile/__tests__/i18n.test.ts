// Covers i18n foundation: full Dutch coverage, fallback, persistence
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../locales/en.json';
import nl from '../locales/nl.json';
import i18n, { setLanguage, SUPPORTED_LANGUAGES, LANGUAGE_STORAGE_KEY } from '../lib/i18n';

/** Flatten a nested translation object into dotted key paths. */
function flatKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) => {
    const path = prefix ? `${prefix}.${k}` : k;
    return v && typeof v === 'object'
      ? flatKeys(v as Record<string, unknown>, path)
      : [path];
  });
}

describe('i18n foundation', () => {
  afterEach(async () => {
    await setLanguage('en');
  });

  it('registers every supported language bundle', () => {
    SUPPORTED_LANGUAGES.forEach((lang) => {
      expect(i18n.hasResourceBundle(lang, 'translation')).toBe(true);
    });
  });

  it('Dutch covers every English key (full nl translation)', () => {
    const enKeys = flatKeys(en).sort();
    const nlKeys = flatKeys(nl).sort();
    expect(nlKeys).toEqual(enKeys);
  });

  it('translates a known key in English and Dutch', async () => {
    await setLanguage('en');
    expect(i18n.t('home.title')).toBe(en.home.title);
    await setLanguage('nl');
    expect(i18n.t('home.title')).toBe(nl.home.title);
  });

  it('falls back to English for an untranslated language', async () => {
    await setLanguage('es');
    expect(i18n.t('home.title')).toBe(en.home.title);
  });

  it('persists the chosen language to storage', async () => {
    await setLanguage('nl');
    expect(await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)).toBe('nl');
  });
});
