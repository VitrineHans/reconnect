// Phase 2 — personalized question selection (the verified spec mirrored by
// rotate_daily_questions() in SQL).

import {
  normalizePrefs,
  pairConstraints,
  eligibleQuestions,
  rankQuestions,
  selectQuestion,
  DEFAULT_DEPTH_COMFORT,
  type OnboardingPrefs,
  type TaggedQuestion,
} from '../lib/questionSelection';

// ── Fixtures ──────────────────────────────────────────────────────────────
const q = (id: string, topics: string[], depth: number): TaggedQuestion => ({ id, topics, depth });

const prefs = (over: Partial<OnboardingPrefs> = {}): OnboardingPrefs => ({
  interests: [],
  offLimits: [],
  depthComfort: 5,
  ...over,
});

describe('normalizePrefs', () => {
  it('returns safe defaults for null/undefined', () => {
    expect(normalizePrefs(null)).toEqual({ interests: [], offLimits: [], depthComfort: DEFAULT_DEPTH_COMFORT });
    expect(normalizePrefs(undefined)).toEqual({ interests: [], offLimits: [], depthComfort: DEFAULT_DEPTH_COMFORT });
  });

  it('drops the "none" sentinel from off_limits', () => {
    expect(normalizePrefs({ off_limits: ['none'] }).offLimits).toEqual([]);
    expect(normalizePrefs({ off_limits: ['money', 'none'] }).offLimits).toEqual(['money']);
  });

  it('keeps valid depth_comfort and falls back on invalid/missing', () => {
    expect(normalizePrefs({ depth_comfort: 1 }).depthComfort).toBe(1);
    expect(normalizePrefs({ depth_comfort: 5 }).depthComfort).toBe(5);
    expect(normalizePrefs({ depth_comfort: 0 }).depthComfort).toBe(DEFAULT_DEPTH_COMFORT);
    expect(normalizePrefs({ depth_comfort: 9 }).depthComfort).toBe(DEFAULT_DEPTH_COMFORT);
    expect(normalizePrefs({}).depthComfort).toBe(DEFAULT_DEPTH_COMFORT);
  });

  it('tolerates non-array interests/off_limits', () => {
    expect(normalizePrefs({ interests: undefined }).interests).toEqual([]);
  });
});

describe('pairConstraints', () => {
  it('unions off-limits and interests and takes the lower depth cap', () => {
    const c = pairConstraints(
      prefs({ offLimits: ['money'], interests: ['food'], depthComfort: 4 }),
      prefs({ offLimits: ['health'], interests: ['travel'], depthComfort: 2 }),
    );
    expect([...c.offLimitTopics].sort()).toEqual(['health', 'money']);
    expect([...c.interestTopics].sort()).toEqual(['food', 'travel']);
    expect(c.depthCap).toBe(2);
  });
});

describe('eligibleQuestions', () => {
  const pool = [
    q('a', [], 1),
    q('b', ['money'], 2),
    q('c', ['relationships'], 5),
    q('d', ['food'], 4),
  ];

  it('excludes already-answered questions', () => {
    const c = pairConstraints(prefs(), prefs());
    const ids = eligibleQuestions(pool, c, new Set(['a', 'd'])).map((x) => x.id);
    expect(ids).toEqual(['b', 'c']);
  });

  it('hard-filters questions touching either friend off-limit topic', () => {
    const c = pairConstraints(prefs({ offLimits: ['money'] }), prefs({ offLimits: ['relationships'] }));
    const ids = eligibleQuestions(pool, c, new Set()).map((x) => x.id).sort();
    expect(ids).toEqual(['a', 'd']); // b (money) and c (relationships) removed
  });

  it('applies the depth cap', () => {
    const c = pairConstraints(prefs({ depthComfort: 2 }), prefs({ depthComfort: 3 }));
    const ids = eligibleQuestions(pool, c, new Set()).map((x) => x.id).sort();
    expect(ids).toEqual(['a', 'b']); // cap = 2 → c(5) and d(4) excluded
  });

  it('relaxes the depth cap when nothing fits, but never serves off-limit', () => {
    const deepOnly = [q('x', ['money'], 1), q('y', [], 5)];
    const c = pairConstraints(prefs({ offLimits: ['money'], depthComfort: 2 }), prefs({ depthComfort: 2 }));
    // x is off-limit (money), y is depth 5 > cap 2 → cap relaxes to include y, x stays excluded
    expect(eligibleQuestions(deepOnly, c, new Set()).map((i) => i.id)).toEqual(['y']);
  });
});

describe('rankQuestions', () => {
  it('orders by interest overlap (desc), then id (asc) deterministically', () => {
    const pool = [
      q('q1', ['food'], 1),
      q('q2', ['food', 'travel'], 1),
      q('q3', [], 1),
      q('q4', ['travel'], 1),
    ];
    const ranked = rankQuestions(
      pool,
      prefs({ interests: ['food'] }),
      prefs({ interests: ['travel'] }),
    ).map((x) => x.id);
    // q2 overlaps both (score 2) → q1 & q4 (score 1, tie → id asc) → q3 (score 0)
    expect(ranked).toEqual(['q2', 'q1', 'q4', 'q3']);
  });

  it('returns an empty list when everything is answered', () => {
    const pool = [q('a', [], 1)];
    expect(rankQuestions(pool, prefs(), prefs(), ['a'])).toEqual([]);
  });
});

describe('selectQuestion', () => {
  const pool = [
    q('a', [], 1),
    q('b', ['food'], 2),
    q('c', ['food', 'travel'], 3),
    q('d', ['money'], 1),
  ];

  it('returns null when there is nothing safe to ask', () => {
    expect(selectQuestion([], prefs(), prefs())).toBeNull();
    expect(selectQuestion([q('a', [], 1)], prefs(), prefs(), ['a'])).toBeNull();
    // only candidate is off-limit
    expect(selectQuestion([q('d', ['money'], 1)], prefs({ offLimits: ['money'] }), prefs())).toBeNull();
  });

  it('picks the highest-interest question when one clearly wins', () => {
    const chosen = selectQuestion(pool, prefs({ interests: ['food', 'travel'] }), prefs(), [], () => 0);
    expect(chosen?.id).toBe('c'); // score 2 beats all
  });

  it('never returns an off-limit question even under random selection', () => {
    for (let i = 0; i < 50; i++) {
      const chosen = selectQuestion(pool, prefs({ offLimits: ['money'] }), prefs(), [], Math.random);
      expect(chosen?.topics.includes('money')).toBe(false);
    }
  });

  it('rotates within the top-scoring tier via rng', () => {
    // No interests → every question scores 0 → whole eligible pool is the tier.
    const flat = [q('a', [], 1), q('b', [], 1), q('c', [], 1)];
    const first = selectQuestion(flat, prefs(), prefs(), [], () => 0);
    const last = selectQuestion(flat, prefs(), prefs(), [], () => 0.99);
    expect(first?.id).toBe('a');
    expect(last?.id).toBe('c');
  });
});
