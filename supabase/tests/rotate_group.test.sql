-- DB test for rotate_group_questions() against the real seed + real migration.
-- Asserts the N-member generalization of the selection rules. Any violation
-- RAISEs and aborts (psql -v ON_ERROR_STOP=1).

-- ── Members ─────────────────────────────────────────────────────────────────
INSERT INTO public.profiles (id, username, onboarding_answers) VALUES
  -- Group A: one member off-limits money+relationships (union must exclude both)
  ('a1110000-0000-4000-8000-000000000001', 'ga1', '{"off_limits":["money","relationships"],"depth_comfort":5}'),
  ('a1110000-0000-4000-8000-000000000002', 'ga2', '{"depth_comfort":5}'),
  ('a1110000-0000-4000-8000-000000000003', 'ga3', '{"interests":["food"],"depth_comfort":5}'),
  -- Group B: most conservative depth is 2
  ('b1110000-0000-4000-8000-000000000001', 'gb1', '{"depth_comfort":2}'),
  ('b1110000-0000-4000-8000-000000000002', 'gb2', '{"depth_comfort":5}'),
  -- Group C: interests union food + travel
  ('c1110000-0000-4000-8000-000000000001', 'gc1', '{"interests":["food"]}'),
  ('c1110000-0000-4000-8000-000000000002', 'gc2', '{"interests":["travel"]}'),
  -- Group D: answered-by-any-member exclusion
  ('d1110000-0000-4000-8000-000000000001', 'gd1', '{"depth_comfort":5}'),
  ('d1110000-0000-4000-8000-000000000002', 'gd2', '{"depth_comfort":5}');

-- ── Groups + membership ───────────────────────────────────────────────────────
INSERT INTO public.groups (id, name, created_by) VALUES
  ('a1110000-0000-4000-8000-0000000000a0', 'GA', 'a1110000-0000-4000-8000-000000000001'),
  ('b1110000-0000-4000-8000-0000000000b0', 'GB', 'b1110000-0000-4000-8000-000000000001'),
  ('c1110000-0000-4000-8000-0000000000c0', 'GC', 'c1110000-0000-4000-8000-000000000001'),
  ('d1110000-0000-4000-8000-0000000000d0', 'GD', 'd1110000-0000-4000-8000-000000000001');

INSERT INTO public.group_members (group_id, user_id) VALUES
  ('a1110000-0000-4000-8000-0000000000a0', 'a1110000-0000-4000-8000-000000000001'),
  ('a1110000-0000-4000-8000-0000000000a0', 'a1110000-0000-4000-8000-000000000002'),
  ('a1110000-0000-4000-8000-0000000000a0', 'a1110000-0000-4000-8000-000000000003'),
  ('b1110000-0000-4000-8000-0000000000b0', 'b1110000-0000-4000-8000-000000000001'),
  ('b1110000-0000-4000-8000-0000000000b0', 'b1110000-0000-4000-8000-000000000002'),
  ('c1110000-0000-4000-8000-0000000000c0', 'c1110000-0000-4000-8000-000000000001'),
  ('c1110000-0000-4000-8000-0000000000c0', 'c1110000-0000-4000-8000-000000000002'),
  ('d1110000-0000-4000-8000-0000000000d0', 'd1110000-0000-4000-8000-000000000001'),
  ('d1110000-0000-4000-8000-0000000000d0', 'd1110000-0000-4000-8000-000000000002');

SELECT public.rotate_group_questions();

-- ── Assertions ───────────────────────────────────────────────────────────────
DO $$
DECLARE qid uuid; qtopics text[]; qdepth int;
BEGIN
  -- A: off-limit union (money + relationships) honored
  SELECT q.id, q.topics FROM public.groups g JOIN public.questions q ON q.id = g.current_question_id
    WHERE g.id = 'a1110000-0000-4000-8000-0000000000a0' INTO qid, qtopics;
  IF qid IS NULL THEN RAISE EXCEPTION 'GA FAIL: nothing assigned'; END IF;
  IF qtopics && ARRAY['money','relationships'] THEN
    RAISE EXCEPTION 'GA FAIL: off-limit assigned (% / %)', qid, qtopics; END IF;
  RAISE NOTICE 'GA PASS  off-limit union honored   q=% topics=%', qid, qtopics;

  -- B: depth cap = min(2,5) = 2
  SELECT q.id, q.depth FROM public.groups g JOIN public.questions q ON q.id = g.current_question_id
    WHERE g.id = 'b1110000-0000-4000-8000-0000000000b0' INTO qid, qdepth;
  IF qid IS NULL THEN RAISE EXCEPTION 'GB FAIL: nothing assigned'; END IF;
  IF qdepth > 2 THEN RAISE EXCEPTION 'GB FAIL: depth % exceeds cap 2', qdepth; END IF;
  RAISE NOTICE 'GB PASS  depth cap (min) honored   q=% depth=%', qid, qdepth;

  -- C: interest union food+travel boosts a matching question to the top tier
  SELECT q.id, q.topics FROM public.groups g JOIN public.questions q ON q.id = g.current_question_id
    WHERE g.id = 'c1110000-0000-4000-8000-0000000000c0' INTO qid, qtopics;
  IF qid IS NULL THEN RAISE EXCEPTION 'GC FAIL: nothing assigned'; END IF;
  IF NOT (qtopics && ARRAY['food','travel']) THEN
    RAISE EXCEPTION 'GC FAIL: interest union ignored (% / %)', qid, qtopics; END IF;
  RAISE NOTICE 'GC PASS  interest union boosted    q=% topics=%', qid, qtopics;
END $$;

-- D: a question answered by ANY member is excluded next round
DO $$
DECLARE first_q uuid; second_q uuid;
BEGIN
  SELECT current_question_id FROM public.groups
    WHERE id = 'd1110000-0000-4000-8000-0000000000d0' INTO first_q;
  IF first_q IS NULL THEN RAISE EXCEPTION 'GD FAIL: nothing assigned first'; END IF;

  -- member gd2 answers; reset; rotate again
  INSERT INTO public.question_responses (group_id, question_id, user_id)
    VALUES ('d1110000-0000-4000-8000-0000000000d0', first_q, 'd1110000-0000-4000-8000-000000000002');
  UPDATE public.groups SET current_question_id = NULL
    WHERE id = 'd1110000-0000-4000-8000-0000000000d0';

  PERFORM public.rotate_group_questions();

  SELECT current_question_id FROM public.groups
    WHERE id = 'd1110000-0000-4000-8000-0000000000d0' INTO second_q;
  IF second_q IS NULL THEN RAISE EXCEPTION 'GD FAIL: nothing assigned second'; END IF;
  IF second_q = first_q THEN RAISE EXCEPTION 'GD FAIL: reassigned a member-answered question'; END IF;
  RAISE NOTICE 'GD PASS  answered-by-any excluded  first=% second=%', first_q, second_q;
END $$;

SELECT '*** ALL GROUP ROTATE SCENARIOS PASSED ***' AS result;
