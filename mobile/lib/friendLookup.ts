/**
 * Add-friend-by-username lookup: input validation + relationship status.
 * Pure logic, kept out of the screen so it's unit-testable.
 */

/** Usernames are 3–20 chars of [a-zA-Z0-9_]; searching is allowed from 2 chars. */
export const SEARCH_QUERY_REGEX = /^[a-zA-Z0-9_]{2,20}$/;

export type SearchValidation = 'empty' | 'invalid' | 'ok';

export function validateSearchQuery(raw: string): SearchValidation {
  const q = raw.trim();
  if (q.length === 0) return 'empty';
  return SEARCH_QUERY_REGEX.test(q) ? 'ok' : 'invalid';
}

export type LookupStatus = 'none' | 'friend' | 'sent' | 'incoming';

/** What is my relationship to this search result? Decides the row's action. */
export function resolveLookupStatus(
  profileId: string,
  friendIds: ReadonlySet<string>,
  outgoingIds: ReadonlySet<string>,
  incomingIds: ReadonlySet<string>,
): LookupStatus {
  if (friendIds.has(profileId)) return 'friend';
  if (outgoingIds.has(profileId)) return 'sent';
  if (incomingIds.has(profileId)) return 'incoming';
  return 'none';
}
