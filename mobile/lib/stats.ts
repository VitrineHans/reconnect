/**
 * Profile engagement: streaks, light XP/levels and achievements.
 * Everything here is derived from REAL persisted data (friendships.streak_count
 * / best_streak and profiles.total_answers — both maintained by DB triggers).
 */

export interface ProfileStats {
  currentStreak: number;  // highest active streak across friendships
  longestStreak: number;  // highest streak ever reached (survives resets)
  totalAnswers: number;   // lifetime video answers (1:1 + group)
  friendsCount: number;
  groupsCount: number;
  memberSince: string | null; // ISO timestamp
}

export interface StreakRow {
  streak_count: number;
  best_streak: number;
}

export function deriveStreaks(rows: StreakRow[]): { current: number; longest: number } {
  let current = 0;
  let longest = 0;
  for (const row of rows) {
    if (row.streak_count > current) current = row.streak_count;
    const best = Math.max(row.best_streak, row.streak_count);
    if (best > longest) longest = best;
  }
  return { current, longest };
}

// ── Light gamification: XP + level ───────────────────────────────────────────

export const XP_PER_ANSWER = 10;

/** Cumulative XP required to REACH a level: L1=0, L2=50, L3=150, L4=300, L5=500… */
export function xpThresholdForLevel(level: number): number {
  return 25 * (level - 1) * level;
}

export interface LevelInfo {
  level: number;
  xp: number;
  levelFloor: number; // XP where this level starts
  nextAt: number;     // XP where the next level starts
  progress: number;   // 0..1 within the current level
}

export function levelForAnswers(totalAnswers: number): LevelInfo {
  const xp = Math.max(0, totalAnswers) * XP_PER_ANSWER;
  let level = 1;
  while (xp >= xpThresholdForLevel(level + 1)) level++;
  const levelFloor = xpThresholdForLevel(level);
  const nextAt = xpThresholdForLevel(level + 1);
  return {
    level,
    xp,
    levelFloor,
    nextAt,
    progress: (xp - levelFloor) / (nextAt - levelFloor),
  };
}

// ── Achievements ─────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  emoji: string;
  nameKey: string;
  descKey: string;
  unlocked: boolean;
}

/** Milestones over real stats; locked ones stay visible as goals. */
export function achievementsFor(stats: ProfileStats): Achievement[] {
  const defs: { id: string; emoji: string; unlocked: boolean }[] = [
    { id: 'firstFriend', emoji: '🤝', unlocked: stats.friendsCount >= 1 },
    { id: 'firstAnswer', emoji: '🎬', unlocked: stats.totalAnswers >= 1 },
    { id: 'firstGroup',  emoji: '👥', unlocked: stats.groupsCount >= 1 },
    { id: 'streak3',     emoji: '🔥', unlocked: stats.longestStreak >= 3 },
    { id: 'streak7',     emoji: '⚡', unlocked: stats.longestStreak >= 7 },
    { id: 'streak30',    emoji: '🏆', unlocked: stats.longestStreak >= 30 },
    { id: 'answers10',   emoji: '🎯', unlocked: stats.totalAnswers >= 10 },
    { id: 'answers50',   emoji: '🌟', unlocked: stats.totalAnswers >= 50 },
    { id: 'answers100',  emoji: '💯', unlocked: stats.totalAnswers >= 100 },
  ];
  return defs.map(({ id, emoji, unlocked }) => ({
    id,
    emoji,
    nameKey: `achievements.${id}.name`,
    descKey: `achievements.${id}.desc`,
    unlocked,
  }));
}
