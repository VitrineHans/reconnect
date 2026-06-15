// Localized question content — text_i18n[lang] ?? text.

import { localizedQuestionText } from '../lib/questionText';

describe('localizedQuestionText', () => {
  it('returns the override for the active language', () => {
    expect(localizedQuestionText('Where is home?', { nl: 'Waar is thuis?' }, 'nl')).toBe('Waar is thuis?');
  });

  it('falls back to English for a language with no override', () => {
    expect(localizedQuestionText('Where is home?', { nl: 'Waar is thuis?' }, 'es')).toBe('Where is home?');
  });

  it('falls back to English when text_i18n is null, empty, or blank', () => {
    expect(localizedQuestionText('Where is home?', null, 'nl')).toBe('Where is home?');
    expect(localizedQuestionText('Where is home?', {}, 'nl')).toBe('Where is home?');
    expect(localizedQuestionText('Where is home?', { nl: '' }, 'nl')).toBe('Where is home?');
  });
});
