// #4 Revive — fading-friendship detection.

jest.mock('../lib/supabase', () => ({ supabase: {} }));

import { isFadingFriendship } from '../hooks/useFriendships';

const NOW = Date.parse('2026-06-24T00:00:00Z');
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

describe('isFadingFriendship', () => {
  it('is fading when the last exchange was more than 10 days ago', () => {
    expect(isFadingFriendship(daysAgo(12), daysAgo(30), NOW)).toBe(true);
  });

  it('is not fading when there was a recent exchange', () => {
    expect(isFadingFriendship(daysAgo(3), daysAgo(30), NOW)).toBe(false);
  });

  it('falls back to created_at when the pair never exchanged', () => {
    expect(isFadingFriendship(null, daysAgo(20), NOW)).toBe(true);  // old + silent
    expect(isFadingFriendship(null, daysAgo(2), NOW)).toBe(false);  // brand new, just hasn't started
  });

  it('is not fading with no timestamps at all', () => {
    expect(isFadingFriendship(null, null, NOW)).toBe(false);
  });
});
