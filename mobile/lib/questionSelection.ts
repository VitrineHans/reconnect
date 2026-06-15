// Phase 2 — Personalized question selection.
//
// This module is the *verified specification* for how a daily question is
// chosen for a friendship from each friend's onboarding answers. The runtime
// selection actually executes server-side in rotate_daily_questions()
// (supabase/migrations/20260615000000_phase2_personalization.sql) on a nightly
// pg_cron job — that SQL mirrors this algorithm exactly. Keeping the logic here
// as pure functions lets us unit-test the decision rules (no DB required); if
// the rules change, change them in both places.
//
// Rules:
//   • Off-limit topics are a HARD filter — a question tagged with any topic in
//     either friend's off_limits is never served (honors the onboarding promise).
//   • Depth is capped at the MORE conservative friend's depth_comfort, but the
//     cap relaxes if honoring it would leave nothing safe to ask.
//   • Interests are a SOFT boost — questions overlapping either friend's
//     interests rank higher; they never restrict the pool.

export const INTEREST_TAGS = [
  'music', 'sport', 'travel', 'food', 'gaming',
  'reading', 'creative', 'film', 'wellness', 'animals',
] as const;

export const SENSITIVE_TAGS = ['family', 'money', 'relationships', 'health'] as const;

export type InterestTag = (typeof INTEREST_TAGS)[number];
export type SensitiveTag = (typeof SENSITIVE_TAGS)[number];
export type Topic = InterestTag | SensitiveTag;

export const MIN_DEPTH = 1;
export const MAX_DEPTH = 5;
export const DEFAULT_DEPTH_COMFORT = 3;

export interface TaggedQuestion {
  id: string;
  topics: string[];
  depth: number;
}

/** Normalized, ready-to-use preferences for one friend. */
export interface OnboardingPrefs {
  interests: string[];
  offLimits: string[];
  depthComfort: number;
}

/** Raw shape stored in profiles.onboarding_answers — every field optional. */
export interface OnboardingAnswers {
  interests?: string[];
  off_limits?: string[];
  depth_comfort?: number;
}

/**
 * Coerce a raw onboarding_answers blob (possibly null / incomplete) into safe
 * preferences. Missing depth_comfort defaults to moderate so we never surprise
 * someone with a deep prompt before they've told us their comfort; 'none' is
 * dropped from off_limits since it means "nothing is off-limits".
 */
export function normalizePrefs(answers: OnboardingAnswers | null | undefined): OnboardingPrefs {
  const a: OnboardingAnswers = answers ?? {};
  const depthValid =
    typeof a.depth_comfort === 'number' &&
    a.depth_comfort >= MIN_DEPTH &&
    a.depth_comfort <= MAX_DEPTH;
  return {
    interests: Array.isArray(a.interests) ? a.interests : [],
    offLimits: Array.isArray(a.off_limits) ? a.off_limits.filter((t) => t !== 'none') : [],
    depthComfort: depthValid ? (a.depth_comfort as number) : DEFAULT_DEPTH_COMFORT,
  };
}

export interface PairConstraints {
  offLimitTopics: Set<string>;
  interestTopics: Set<string>;
  depthCap: number;
}

/**
 * Combine N members' prefs into the constraints that govern selection: the
 * UNION of off-limit topics (never serve any), the UNION of interests (boost),
 * and the lowest (most conservative) depth comfort. Works for a 1:1 pair or a
 * whole group.
 */
export function combineConstraints(prefs: OnboardingPrefs[]): PairConstraints {
  const offLimitTopics = new Set<string>();
  const interestTopics = new Set<string>();
  let depthCap = MAX_DEPTH;
  for (const p of prefs) {
    p.offLimits.forEach((t) => offLimitTopics.add(t));
    p.interests.forEach((t) => interestTopics.add(t));
    depthCap = Math.min(depthCap, p.depthComfort);
  }
  return {
    offLimitTopics,
    interestTopics,
    depthCap: prefs.length === 0 ? DEFAULT_DEPTH_COMFORT : depthCap,
  };
}

/** Combine two friends' prefs — the 1:1 case of combineConstraints. */
export function pairConstraints(a: OnboardingPrefs, b: OnboardingPrefs): PairConstraints {
  return combineConstraints([a, b]);
}

function hasOverlap(topics: string[], set: Set<string>): boolean {
  return topics.some((t) => set.has(t));
}

function interestScore(topics: string[], interests: Set<string>): number {
  return topics.reduce((n, t) => (interests.has(t) ? n + 1 : n), 0);
}

/**
 * The questions a friendship may be asked next: unanswered, never off-limit,
 * within the depth cap — or, if nothing fits the cap, the unanswered safe
 * questions regardless of depth (off-limit is never relaxed).
 */
export function eligibleQuestions(
  candidates: TaggedQuestion[],
  constraints: PairConstraints,
  answeredIds: ReadonlySet<string>,
): TaggedQuestion[] {
  const safe = candidates.filter(
    (q) => !answeredIds.has(q.id) && !hasOverlap(q.topics, constraints.offLimitTopics),
  );
  const withinDepth = safe.filter((q) => q.depth <= constraints.depthCap);
  return withinDepth.length > 0 ? withinDepth : safe;
}

/** Eligible questions best-first: interest overlap (desc), then id (asc). */
function rankByConstraints(
  candidates: TaggedQuestion[],
  constraints: PairConstraints,
  answeredIds: ReadonlySet<string>,
): TaggedQuestion[] {
  const eligible = eligibleQuestions(candidates, constraints, answeredIds);
  return [...eligible].sort((x, y) => {
    const byScore =
      interestScore(y.topics, constraints.interestTopics) -
      interestScore(x.topics, constraints.interestTopics);
    if (byScore !== 0) return byScore;
    return x.id < y.id ? -1 : x.id > y.id ? 1 : 0;
  });
}

/** Random pick among the highest-scoring tier; null when nothing is eligible. */
function selectByConstraints(
  candidates: TaggedQuestion[],
  constraints: PairConstraints,
  answeredIds: ReadonlySet<string>,
  rng: () => number,
): TaggedQuestion | null {
  const ranked = rankByConstraints(candidates, constraints, answeredIds);
  if (ranked.length === 0) return null;
  const topScore = interestScore(ranked[0].topics, constraints.interestTopics);
  const topTier = ranked.filter((q) => interestScore(q.topics, constraints.interestTopics) === topScore);
  const idx = Math.min(Math.floor(rng() * topTier.length), topTier.length - 1);
  return topTier[idx];
}

/** 1:1 ranking — eligible questions best-first for two friends. */
export function rankQuestions(
  candidates: TaggedQuestion[],
  a: OnboardingPrefs,
  b: OnboardingPrefs,
  answeredIds: Iterable<string> = [],
): TaggedQuestion[] {
  return rankByConstraints(candidates, pairConstraints(a, b), new Set(answeredIds));
}

/** 1:1 selection — one question for the pair (null if nothing safe is left). */
export function selectQuestion(
  candidates: TaggedQuestion[],
  a: OnboardingPrefs,
  b: OnboardingPrefs,
  answeredIds: Iterable<string> = [],
  rng: () => number = Math.random,
): TaggedQuestion | null {
  return selectByConstraints(candidates, pairConstraints(a, b), new Set(answeredIds), rng);
}

/** Group ranking — eligible questions best-first across N members. */
export function rankGroupQuestions(
  candidates: TaggedQuestion[],
  prefs: OnboardingPrefs[],
  answeredIds: Iterable<string> = [],
): TaggedQuestion[] {
  return rankByConstraints(candidates, combineConstraints(prefs), new Set(answeredIds));
}

/** Group selection — one question for the whole group (null if nothing safe). */
export function selectGroupQuestion(
  candidates: TaggedQuestion[],
  prefs: OnboardingPrefs[],
  answeredIds: Iterable<string> = [],
  rng: () => number = Math.random,
): TaggedQuestion | null {
  return selectByConstraints(candidates, combineConstraints(prefs), new Set(answeredIds), rng);
}
