// Profile engagement derivations — streaks, XP/level, achievements.
// All inputs mirror real persisted data (DB-trigger-maintained counters).

import {
  deriveStreaks,
  levelForAnswers,
  xpThresholdForLevel,
  achievementsFor,
  XP_PER_ANSWER,
  type ProfileStats,
} from '../lib/stats';

function makeStats(over: Partial<ProfileStats> = {}): ProfileStats {
  return {
    currentStreak: 0,
    longestStreak: 0,
    totalAnswers: 0,
    friendsCount: 0,
    groupsCount: 0,
    memberSince: null,
    ...over,
  };
}

describe('deriveStreaks', () => {
  it('is 0/0 for a new user with no friendships', () => {
    expect(deriveStreaks([])).toEqual({ current: 0, longest: 0 });
  });

  it('takes the max active streak across friendships', () => {
    const rows = [
      { streak_count: 2, best_streak: 2 },
      { streak_count: 7, best_streak: 9 },
      { streak_count: 0, best_streak: 15 },
    ];
    expect(deriveStreaks(rows)).toEqual({ current: 7, longest: 15 });
  });

  it('longest is never below current (pre-backfill safety)', () => {
    // best_streak defaults to 0 on rows that pre-date the column
    expect(deriveStreaks([{ streak_count: 4, best_streak: 0 }])).toEqual({ current: 4, longest: 4 });
  });
});

describe('levelForAnswers', () => {
  it('starts at level 1 with 0 XP', () => {
    const info = levelForAnswers(0);
    expect(info.level).toBe(1);
    expect(info.xp).toBe(0);
    expect(info.progress).toBe(0);
  });

  it('levels up at the cumulative thresholds', () => {
    // L2 at 50 XP = 5 answers, L3 at 150 XP = 15 answers
    expect(levelForAnswers(4).level).toBe(1);
    expect(levelForAnswers(5).level).toBe(2);
    expect(levelForAnswers(14).level).toBe(2);
    expect(levelForAnswers(15).level).toBe(3);
  });

  it('progress is a 0..1 fraction within the level', () => {
    const info = levelForAnswers(10); // 100 XP: L2 spans 50..150
    expect(info.level).toBe(2);
    expect(info.progress).toBeCloseTo(0.5);
    expect(info.nextAt).toBe(xpThresholdForLevel(3));
  });

  it('XP scales linearly with answers', () => {
    expect(levelForAnswers(7).xp).toBe(7 * XP_PER_ANSWER);
  });
});

describe('achievementsFor', () => {
  it('everything is locked for a brand-new user', () => {
    const all = achievementsFor(makeStats());
    expect(all).toHaveLength(9);
    expect(all.every((a) => !a.unlocked)).toBe(true);
  });

  it('unlocks exactly at each milestone boundary', () => {
    const stats = makeStats({ longestStreak: 7, totalAnswers: 10, friendsCount: 1 });
    const byId = Object.fromEntries(achievementsFor(stats).map((a) => [a.id, a.unlocked]));
    expect(byId.firstFriend).toBe(true);
    expect(byId.firstAnswer).toBe(true);
    expect(byId.firstGroup).toBe(false);
    expect(byId.streak3).toBe(true);
    expect(byId.streak7).toBe(true);
    expect(byId.streak30).toBe(false);
    expect(byId.answers10).toBe(true);
    expect(byId.answers50).toBe(false);
  });

  it('points at existing i18n keys', () => {
    const en = require('../locales/en.json');
    const nl = require('../locales/nl.json');
    for (const a of achievementsFor(makeStats())) {
      const [section, id, field] = a.nameKey.split('.');
      expect(en[section][id][field]).toBeTruthy();
      expect(nl[section][id][field]).toBeTruthy();
      const [, , descField] = a.descKey.split('.');
      expect(en[section][id][descField]).toBeTruthy();
    }
  });
});
