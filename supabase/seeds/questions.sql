-- Seed: 54 questions across funny, deep, and personal categories.
--
-- Phase 2 (personalization) gives every question STABLE ids + a topic/depth
-- tag so rotate_daily_questions() can honor onboarding answers. The insert is
-- idempotent (ON CONFLICT (id) DO UPDATE), so re-running the seed re-tags the
-- existing rows in place instead of duplicating them.
--
-- topics  — controlled vocab (see 20260615000000_phase2_personalization.sql):
--           interest tags boost ranking; sensitive tags (family/money/
--           relationships/health) filter out a pair's off-limit topics.
--           Tagged conservatively: most introspective prompts stay general.
-- depth   — 1–5, matched against the more conservative friend's depth_comfort.

INSERT INTO public.questions (id, text, category, topics, depth) VALUES
-- ============================================================
-- Funny
-- ============================================================
('00000000-0000-4000-8000-000000000001', 'What''s the most embarrassing autocorrect fail you''ve sent to the wrong person?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000002', 'If you had to explain what you do for work using only emojis, what would you send?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000003', 'What''s the weirdest thing you''ve googled in the last week that you''d be mortified if someone saw?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000004', 'What''s a completely irrational hill you''re willing to die on?', 'funny', '{}', 2),
('00000000-0000-4000-8000-000000000005', 'What''s the most ridiculous lie you told as a kid to get out of trouble?', 'funny', '{}', 2),
('00000000-0000-4000-8000-000000000006', 'If your life had a laugh track, what situation would have triggered it most this week?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000007', 'What''s your personal worst "reply all" email disaster or closest call?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000008', 'What totally made-up word do you use at home that your household takes completely seriously?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000009', 'Describe the last time you confidently waved back at someone who wasn''t waving at you.', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000010', 'What skill have you been pretending to have for years but still couldn''t execute if called upon today?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000011', 'If a documentary crew followed you around for one week, what would be the most awkward scene?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000012', 'What''s your most embarrassing "I thought I was on mute" or "I thought my camera was off" story?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000013', 'What''s the most dramatic way you''ve ever reacted to something that was 100% your fault?', 'funny', '{}', 2),
('00000000-0000-4000-8000-000000000014', 'If you had to audition for a reality TV show with whatever talent you have right now, what would you do?', 'funny', '{creative}', 1),
('00000000-0000-4000-8000-000000000015', 'What''s a food combination you eat in private that you would never admit to ordering in a restaurant?', 'funny', '{food}', 1),
('00000000-0000-4000-8000-000000000016', 'When was the last time you laughed so hard at something completely inappropriate?', 'funny', '{}', 2),
('00000000-0000-4000-8000-000000000017', 'What''s the most elaborate excuse you''ve ever constructed to avoid doing something simple?', 'funny', '{}', 1),
('00000000-0000-4000-8000-000000000018', 'What''s a deeply held opinion about something trivial — like the correct way to load a dishwasher — that you would argue about at length?', 'funny', '{}', 2),
-- ============================================================
-- Deep
-- ============================================================
('00000000-0000-4000-8000-000000000019', 'Is there a belief you held for years that you''ve completely reversed on? What changed?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000020', 'What''s a version of yourself from five years ago that would surprise current you?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000021', 'When did you last feel genuinely proud of yourself, and did you let yourself sit with that feeling?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000022', 'What''s a fear you''ve never said out loud to anyone?', 'deep', '{}', 5),
('00000000-0000-4000-8000-000000000023', 'If the people who love you most were asked to describe your blind spot, what do you think they''d say?', 'deep', '{}', 5),
('00000000-0000-4000-8000-000000000024', 'What does "home" mean to you right now, and does any place actually feel like it?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000025', 'What are you currently tolerating in your life that you know you''ll eventually have to address?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000026', 'Is there something you''ve forgiven someone for but haven''t fully let go of?', 'deep', '{relationships}', 5),
('00000000-0000-4000-8000-000000000027', 'What''s a chapter of your life you rarely talk about but shaped who you are significantly?', 'deep', '{}', 5),
('00000000-0000-4000-8000-000000000028', 'What would you do differently if you knew no one would judge you for it?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000029', 'What relationship in your life has surprised you the most — either by growing or fading?', 'deep', '{relationships}', 4),
('00000000-0000-4000-8000-000000000030', 'What''s something you want that you''ve talked yourself out of wanting because it feels too big?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000031', 'When you''re struggling, what''s your first instinct — reach out or go quiet?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000032', 'What''s a compliment you received that you still think about years later?', 'deep', '{}', 3),
('00000000-0000-4000-8000-000000000033', 'What does your relationship with money reveal about your deeper values?', 'deep', '{money}', 4),
('00000000-0000-4000-8000-000000000034', 'If you could send one message to your 16-year-old self, what would actually help them — not just reassure them?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000035', 'What''s something you wish people understood about you without you having to explain it?', 'deep', '{}', 4),
('00000000-0000-4000-8000-000000000036', 'What''s the most important thing a relationship — friendship or romantic — has taught you about yourself?', 'deep', '{relationships}', 4),
-- ============================================================
-- Personal
-- ============================================================
('00000000-0000-4000-8000-000000000037', 'What''s something you''re proud of that you''ve never told anyone?', 'personal', '{}', 3),
('00000000-0000-4000-8000-000000000038', 'What''s a habit or ritual that''s been quietly keeping you sane lately?', 'personal', '{wellness}', 3),
('00000000-0000-4000-8000-000000000039', 'What''s something on your mind right now that you haven''t found the right moment to bring up with someone?', 'personal', '{}', 3),
('00000000-0000-4000-8000-000000000040', 'What''s the last thing that genuinely excited you — not obligated you, but excited you?', 'personal', '{}', 2),
('00000000-0000-4000-8000-000000000041', 'When was the last time you cried, and was it for the reason you''d admit first?', 'personal', '{}', 4),
('00000000-0000-4000-8000-000000000042', 'What are you working on right now that nobody knows about?', 'personal', '{}', 3),
('00000000-0000-4000-8000-000000000043', 'What''s a small act of kindness someone did for you that you still think about?', 'personal', '{}', 2),
('00000000-0000-4000-8000-000000000044', 'What''s a decision you made recently that was entirely for yourself and no one else?', 'personal', '{}', 3),
('00000000-0000-4000-8000-000000000045', 'What''s something you''ve been meaning to start — or stop — for longer than a year?', 'personal', '{}', 3),
('00000000-0000-4000-8000-000000000046', 'What does your ideal Saturday morning look like, and when did you last actually have one?', 'personal', '{wellness}', 2),
('00000000-0000-4000-8000-000000000047', 'What''s a moment from this past month that quietly meant a lot to you?', 'personal', '{}', 3),
('00000000-0000-4000-8000-000000000048', 'Who do you call when something goes wrong? Who do you call when something goes right?', 'personal', '{relationships}', 3),
('00000000-0000-4000-8000-000000000049', 'What''s something you''re in the middle of right now — creatively, professionally, personally — that you''re not ready to talk about publicly?', 'personal', '{creative}', 3),
('00000000-0000-4000-8000-000000000050', 'What''s the most honest thing you could say about where you are in life right now?', 'personal', '{}', 4),
('00000000-0000-4000-8000-000000000051', 'What''s a place you''ve been that changed how you see things?', 'personal', '{travel}', 3),
('00000000-0000-4000-8000-000000000052', 'When do you feel most like yourself?', 'personal', '{}', 3),
('00000000-0000-4000-8000-000000000053', 'What''s something you''ve given up on that you still grieve a little?', 'personal', '{}', 4),
('00000000-0000-4000-8000-000000000054', 'What does your relationship with your phone say about what you''re actually looking for?', 'personal', '{wellness}', 3)
ON CONFLICT (id) DO UPDATE SET
  text     = EXCLUDED.text,
  category = EXCLUDED.category,
  topics   = EXCLUDED.topics,
  depth    = EXCLUDED.depth;
