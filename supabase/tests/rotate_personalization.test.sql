-- DB test for rotate_daily_questions() — runs against a real Postgres with the
-- real Phase 2 migration + seed loaded. Each scenario asserts a spec invariant
-- (mirrors mobile/lib/questionSelection.ts); any violation RAISEs and, under
-- psql -v ON_ERROR_STOP=1, aborts the run with a non-zero exit.
-- Run via: supabase/tests/run_db_tests.sh

-- ── Profiles ────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, username, onboarding_answers) VALUES
  -- A: off-limits money+relationships (invariant)
  ('aaaa0000-0000-4000-8000-000000000001', 'a1', '{"off_limits":["money","relationships"],"depth_comfort":5}'),
  ('aaaa0000-0000-4000-8000-000000000002', 'a2', '{"depth_comfort":5}'),
  -- G: off-limits money+relationships (strict — every safe question pre-answered)
  ('99990000-0000-4000-8000-000000000001', 'g1', '{"off_limits":["money","relationships"],"depth_comfort":5}'),
  ('99990000-0000-4000-8000-000000000002', 'g2', '{"depth_comfort":5}'),
  -- B: depth comfort 2 and 4 -> cap 2
  ('bbbb0000-0000-4000-8000-000000000001', 'b1', '{"depth_comfort":2}'),
  ('bbbb0000-0000-4000-8000-000000000002', 'b2', '{"depth_comfort":4}'),
  -- C: interests food + travel
  ('cccc0000-0000-4000-8000-000000000001', 'c1', '{"interests":["food"]}'),
  ('cccc0000-0000-4000-8000-000000000002', 'c2', '{"interests":["travel"]}'),
  -- D: answered-exclusion
  ('dddd0000-0000-4000-8000-000000000001', 'd1', '{"depth_comfort":5}'),
  ('dddd0000-0000-4000-8000-000000000002', 'd2', '{"depth_comfort":5}'),
  -- E: no onboarding at all -> defaults (depth cap 3)
  ('eeee0000-0000-4000-8000-000000000001', 'e1', NULL),
  ('eeee0000-0000-4000-8000-000000000002', 'e2', NULL);

-- ── Friendships (no current question yet) ────────────────────────────────────
INSERT INTO public.friendships (id, user_a, user_b) VALUES
  ('ffff0000-0000-4000-8000-00000000000a', 'aaaa0000-0000-4000-8000-000000000001', 'aaaa0000-0000-4000-8000-000000000002'),
  ('ffff0000-0000-4000-8000-00000000000b', 'bbbb0000-0000-4000-8000-000000000001', 'bbbb0000-0000-4000-8000-000000000002'),
  ('ffff0000-0000-4000-8000-00000000000c', 'cccc0000-0000-4000-8000-000000000001', 'cccc0000-0000-4000-8000-000000000002'),
  ('ffff0000-0000-4000-8000-00000000000d', 'dddd0000-0000-4000-8000-000000000001', 'dddd0000-0000-4000-8000-000000000002'),
  ('ffff0000-0000-4000-8000-00000000000e', 'eeee0000-0000-4000-8000-000000000001', 'eeee0000-0000-4000-8000-000000000002'),
  ('ffff0000-0000-4000-8000-0000000000a9', '99990000-0000-4000-8000-000000000001', '99990000-0000-4000-8000-000000000002');

-- Scenario G setup: friend G has already answered every NON-off-limit question,
-- so only money/relationships questions remain — the filter must refuse all.
INSERT INTO public.question_responses (friendship_id, question_id, user_id)
SELECT 'ffff0000-0000-4000-8000-0000000000a9', q.id, '99990000-0000-4000-8000-000000000001'
  FROM public.questions q
 WHERE NOT (q.topics && ARRAY['money','relationships']);

SELECT public.rotate_daily_questions();

-- ── Assertions ───────────────────────────────────────────────────────────────
DO $$
DECLARE qid uuid; qtopics text[]; qdepth int;
BEGIN
  -- A: off-limit invariant
  SELECT q.id, q.topics FROM public.friendships f JOIN public.questions q ON q.id = f.current_question_id
    WHERE f.id = 'ffff0000-0000-4000-8000-00000000000a' INTO qid, qtopics;
  IF qid IS NULL THEN RAISE EXCEPTION 'A FAIL: nothing assigned'; END IF;
  IF qtopics && ARRAY['money','relationships'] THEN
    RAISE EXCEPTION 'A FAIL: off-limit question assigned (% / %)', qid, qtopics; END IF;
  RAISE NOTICE 'A PASS  off-limit honored      q=% topics=%', qid, qtopics;

  -- G: strict — only off-limit questions remain, so NOTHING may be assigned
  SELECT current_question_id FROM public.friendships
    WHERE id = 'ffff0000-0000-4000-8000-0000000000a9' INTO qid;
  IF qid IS NOT NULL THEN
    RAISE EXCEPTION 'G FAIL: served an off-limit question rather than nothing (%)', qid; END IF;
  RAISE NOTICE 'G PASS  refused off-limit even when pool exhausted (assigned NULL)';

  -- B: depth cap = min(2,4) = 2
  SELECT q.id, q.depth FROM public.friendships f JOIN public.questions q ON q.id = f.current_question_id
    WHERE f.id = 'ffff0000-0000-4000-8000-00000000000b' INTO qid, qdepth;
  IF qid IS NULL THEN RAISE EXCEPTION 'B FAIL: nothing assigned'; END IF;
  IF qdepth > 2 THEN RAISE EXCEPTION 'B FAIL: depth % exceeds cap 2 (%)', qdepth, qid; END IF;
  RAISE NOTICE 'B PASS  depth cap honored      q=% depth=%', qid, qdepth;

  -- C: interest boost — top tier is the food/travel questions
  SELECT q.id, q.topics FROM public.friendships f JOIN public.questions q ON q.id = f.current_question_id
    WHERE f.id = 'ffff0000-0000-4000-8000-00000000000c' INTO qid, qtopics;
  IF qid IS NULL THEN RAISE EXCEPTION 'C FAIL: nothing assigned'; END IF;
  IF NOT (qtopics && ARRAY['food','travel']) THEN
    RAISE EXCEPTION 'C FAIL: interest boost ignored (% / %)', qid, qtopics; END IF;
  RAISE NOTICE 'C PASS  interest boost applied q=% topics=%', qid, qtopics;

  -- E: null onboarding -> default depth cap 3
  SELECT q.id, q.depth FROM public.friendships f JOIN public.questions q ON q.id = f.current_question_id
    WHERE f.id = 'ffff0000-0000-4000-8000-00000000000e' INTO qid, qdepth;
  IF qid IS NULL THEN RAISE EXCEPTION 'E FAIL: nothing assigned'; END IF;
  IF qdepth > 3 THEN RAISE EXCEPTION 'E FAIL: depth % exceeds default cap 3 (%)', qdepth, qid; END IF;
  RAISE NOTICE 'E PASS  default depth cap (3)   q=% depth=%', qid, qdepth;
END $$;

-- D: already-answered exclusion (two-step)
DO $$
DECLARE first_q uuid; second_q uuid;
BEGIN
  SELECT current_question_id FROM public.friendships
    WHERE id = 'ffff0000-0000-4000-8000-00000000000d' INTO first_q;
  IF first_q IS NULL THEN RAISE EXCEPTION 'D FAIL: nothing assigned on first rotate'; END IF;

  INSERT INTO public.question_responses (friendship_id, question_id, user_id)
    VALUES ('ffff0000-0000-4000-8000-00000000000d', first_q, 'dddd0000-0000-4000-8000-000000000001');
  UPDATE public.friendships SET current_question_id = NULL
    WHERE id = 'ffff0000-0000-4000-8000-00000000000d';

  PERFORM public.rotate_daily_questions();

  SELECT current_question_id FROM public.friendships
    WHERE id = 'ffff0000-0000-4000-8000-00000000000d' INTO second_q;
  IF second_q IS NULL THEN RAISE EXCEPTION 'D FAIL: nothing assigned on second rotate'; END IF;
  IF second_q = first_q THEN RAISE EXCEPTION 'D FAIL: reassigned an answered question (%)', first_q; END IF;
  RAISE NOTICE 'D PASS  answered exclusion      first=% second=%', first_q, second_q;
END $$;

SELECT '*** ALL ROTATE SCENARIOS PASSED ***' AS result;
