// Localized question content — bundle translations resolved by English text.

import { localizedQuestionText } from '../lib/questionText';
import { QUESTION_TRANSLATIONS } from '../lib/questionTranslations';

const EN = 'When was the last time you laughed so hard at something completely inappropriate?';

describe('localizedQuestionText', () => {
  it('returns the NL override for a known question text', () => {
    expect(localizedQuestionText(EN, 'nl')).toBe(QUESTION_TRANSLATIONS[EN].nl);
    expect(localizedQuestionText(EN, 'nl')).not.toBe(EN);
  });

  it('falls back to English for a language with no override', () => {
    expect(localizedQuestionText(EN, 'es')).toBe(EN);
  });

  it('falls back to English for an unknown question', () => {
    expect(localizedQuestionText('A brand new question?', 'nl')).toBe('A brand new question?');
  });

  it('has a non-empty Dutch translation for all 54 seed questions', () => {
    const keys = Object.keys(QUESTION_TRANSLATIONS);
    expect(keys).toHaveLength(54);
    keys.forEach((k) => expect(QUESTION_TRANSLATIONS[k].nl.length).toBeGreaterThan(0));
  });
});
