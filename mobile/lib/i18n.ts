import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from '../locales/en.json';
import nl from '../locales/nl.json';
import es from '../locales/es.json';
import de from '../locales/de.json';
import fr from '../locales/fr.json';

export const SUPPORTED_LANGUAGES = ['en', 'nl', 'es', 'de', 'fr'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Native display names for the language picker. */
export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: 'English',
  nl: 'Nederlands',
  es: 'Español',
  de: 'Deutsch',
  fr: 'Français',
};

export const LANGUAGE_STORAGE_KEY = 'reconnect.language';

const resources = {
  en: { translation: en },
  nl: { translation: nl },
  es: { translation: es },
  de: { translation: de },
  fr: { translation: fr },
};

function isSupported(code: string | null | undefined): code is SupportedLanguage {
  return !!code && (SUPPORTED_LANGUAGES as readonly string[]).includes(code);
}

/** Best-guess language from the device locale, defaulting to English. */
function deviceLanguage(): SupportedLanguage {
  try {
    const code = getLocales()?.[0]?.languageCode;
    if (isSupported(code)) return code;
  } catch {
    // expo-localization unavailable (e.g. tests) — fall through
  }
  return 'en';
}

i18n.use(initReactI18next).init({
  resources,
  lng: deviceLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnNull: false,
});

// Apply any persisted user preference once it loads (overrides device default).
AsyncStorage.getItem(LANGUAGE_STORAGE_KEY)
  .then((stored) => {
    if (isSupported(stored) && stored !== i18n.language) {
      i18n.changeLanguage(stored);
    }
  })
  .catch(() => {
    // ignore — keep the device/default language
  });

/** Change the active language and persist the choice. */
export async function setLanguage(lang: SupportedLanguage): Promise<void> {
  await i18n.changeLanguage(lang);
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {
    // persistence is best-effort
  }
}

export default i18n;
