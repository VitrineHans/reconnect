import i18n from './i18n';
import { QUESTION_TRANSLATIONS } from './questionTranslations';

/**
 * Resolve a question's display text for the active language. Questions are DB
 * content (English `text`); translations ship in the app bundle keyed by that
 * English text (QUESTION_TRANSLATIONS) so the lookup is independent of the row's
 * UUID. Falls back to English when there's no override — matching the rest of
 * the app (only EN + NL are full).
 */
export function localizedQuestionText(text: string, lang: string = i18n.language): string {
  const override = QUESTION_TRANSLATIONS[text]?.[lang];
  return override && override.length > 0 ? override : text;
}
