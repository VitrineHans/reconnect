import i18n from './i18n';

/**
 * Resolve a question's display text for the active language. Questions are DB
 * content; `text` is the canonical English and `textI18n` holds per-language
 * overrides ({ nl: "…" }). Falls back to English when there's no override —
 * matching the rest of the app (only EN + NL are fully translated).
 */
export function localizedQuestionText(
  text: string,
  textI18n: Record<string, string> | null | undefined,
  lang: string = i18n.language,
): string {
  const override = textI18n?.[lang];
  return override && override.length > 0 ? override : text;
}
