// Phase 5 — contract test for rotate_group_questions() SQL.
// Logic is verified end-to-end against real Postgres in
// supabase/tests/rotate_group.test.sql; this guards the SQL↔spec mirror inside
// the Jest green-gate so the N-member selection clauses can't silently drift.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SQL = readFileSync(
  join(__dirname, '..', '..', 'supabase', 'migrations', '20260615000004_phase5_group_rotation.sql'),
  'utf8',
);

describe('rotate_group_questions() contract', () => {
  it('defines the group rotation function', () => {
    expect(SQL).toMatch(/function public\.rotate_group_questions\(\)/i);
  });

  it('unions members via group_members joined to profiles', () => {
    expect(SQL).toMatch(/from public\.group_members gm/i);
    expect(SQL).toMatch(/join public\.profiles p on p\.id = gm\.user_id/i);
  });

  it('hard-filters the off-limit union and drops the none sentinel', () => {
    expect(SQL).toMatch(/NOT \(q\.topics && off_limits\)/);
    expect(SQL).toMatch(/t <> 'none'/);
  });

  it('caps depth at the most conservative member (min, default 3)', () => {
    expect(SQL).toMatch(/min\(/i);
    expect(SQL).toMatch(/ELSE 3 END\), 3\)/);
    expect(SQL).toMatch(/depth <= depth_cap/);
  });

  it('excludes questions answered by ANY member of the group', () => {
    expect(SQL).toMatch(/q\.id NOT IN \(\s*SELECT question_id\s*FROM public\.question_responses\s*WHERE group_id = g\.id/i);
  });

  it('orders by within-cap, interest overlap, then random tie-break', () => {
    expect(SQL).toMatch(/ORDER BY e\.within_cap DESC, e\.interest_score DESC, random\(\)/);
  });
});
