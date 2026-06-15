// Phase 2 — contract test for the personalized rotate_daily_questions() SQL.
//
// The selection logic runs in PostgreSQL (no DB in the Jest env), and its rules
// are unit-tested against the verified spec in questionSelection.test.ts. This
// test guards the SQL↔spec mirror by asserting the migration still contains the
// non-negotiable selection clauses — so the off-limit promise can't silently be
// dropped or the ordering quietly broken in a future edit.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL = readFileSync(
  join(__dirname, '..', '..', 'supabase', 'migrations', '20260615000001_phase2_rotate_personalized.sql'),
  'utf8',
);

describe('rotate_daily_questions() personalization contract', () => {
  it('replaces the function (not a fresh one)', () => {
    expect(SQL).toMatch(/CREATE OR REPLACE FUNCTION public\.rotate_daily_questions\(\)/);
  });

  it('hard-filters off-limit topics via array overlap (the onboarding promise)', () => {
    expect(SQL).toMatch(/NOT \(q\.topics && off_limits\)/);
  });

  it('drops the "none" sentinel from off-limit topics', () => {
    expect(SQL).toMatch(/t <> 'none'/);
  });

  it('caps depth at the more conservative friend, defaulting to 3', () => {
    expect(SQL).toMatch(/min\(/);
    expect(SQL).toMatch(/ELSE 3 END\), 3\)/);
    expect(SQL).toMatch(/depth <= depth_cap/);
  });

  it('orders by within-cap, then interest overlap, then random tie-break', () => {
    expect(SQL).toMatch(/ORDER BY e\.within_cap DESC, e\.interest_score DESC, random\(\)/);
  });

  it('only assigns to friendships without a current question and stamps the window', () => {
    expect(SQL).toMatch(/WHERE current_question_id IS NULL/);
    expect(SQL).toMatch(/window_opened_at\s*=\s*now\(\)/);
  });

  it('excludes already-answered questions for the friendship', () => {
    expect(SQL).toMatch(/q\.id NOT IN \(\s*SELECT question_id/);
  });
});
