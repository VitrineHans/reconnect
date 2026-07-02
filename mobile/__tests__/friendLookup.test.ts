// Add-friend-by-username: query validation + relationship status resolution

import { validateSearchQuery, resolveLookupStatus } from '../lib/friendLookup';

describe('validateSearchQuery', () => {
  it('is empty for blank or whitespace input', () => {
    expect(validateSearchQuery('')).toBe('empty');
    expect(validateSearchQuery('   ')).toBe('empty');
  });

  it('accepts the username charset from 2 chars', () => {
    expect(validateSearchQuery('ab')).toBe('ok');
    expect(validateSearchQuery('alex_jones')).toBe('ok');
    expect(validateSearchQuery('User123')).toBe('ok');
    expect(validateSearchQuery(' alice ')).toBe('ok'); // trimmed
  });

  it('rejects too-short, too-long, and illegal characters', () => {
    expect(validateSearchQuery('a')).toBe('invalid');
    expect(validateSearchQuery('a'.repeat(21))).toBe('invalid');
    expect(validateSearchQuery('user-name')).toBe('invalid');
    expect(validateSearchQuery('user@name')).toBe('invalid');
    expect(validateSearchQuery('a b')).toBe('invalid');
  });
});

describe('resolveLookupStatus', () => {
  const friends = new Set(['f1']);
  const outgoing = new Set(['o1']);
  const incoming = new Set(['i1']);

  it('detects an existing friend', () => {
    expect(resolveLookupStatus('f1', friends, outgoing, incoming)).toBe('friend');
  });

  it('detects an already-sent request', () => {
    expect(resolveLookupStatus('o1', friends, outgoing, incoming)).toBe('sent');
  });

  it('detects an incoming invite', () => {
    expect(resolveLookupStatus('i1', friends, outgoing, incoming)).toBe('incoming');
  });

  it('falls through to none (addable)', () => {
    expect(resolveLookupStatus('x9', friends, outgoing, incoming)).toBe('none');
  });

  it('friendship wins over a stale invite in both directions', () => {
    expect(resolveLookupStatus('f1', friends, new Set(['f1']), new Set(['f1']))).toBe('friend');
  });
});
