-- Backfill question topics + depth on existing rows, keyed by English text.
--
-- The Phase 2 re-seed (stable ids + tags) can't be re-applied to a DB that
-- already has the original questions: it upserts on id, and the existing rows
-- have different UUIDs, so it would INSERT 54 duplicates. Matching on text lets
-- us tag the rows that are actually there. Idempotent. On a fresh `db reset`
-- this runs before the seed (0 rows) and is harmless — the seed sets the tags.
UPDATE public.questions q
   SET topics = v.topics, depth = v.depth
  FROM (VALUES
    -- Funny
    ('What''s the most embarrassing autocorrect fail you''ve sent to the wrong person?', '{}'::text[], 1),
    ('If you had to explain what you do for work using only emojis, what would you send?', '{}'::text[], 1),
    ('What''s the weirdest thing you''ve googled in the last week that you''d be mortified if someone saw?', '{}'::text[], 1),
    ('What''s a completely irrational hill you''re willing to die on?', '{}'::text[], 2),
    ('What''s the most ridiculous lie you told as a kid to get out of trouble?', '{}'::text[], 2),
    ('If your life had a laugh track, what situation would have triggered it most this week?', '{}'::text[], 1),
    ('What''s your personal worst "reply all" email disaster or closest call?', '{}'::text[], 1),
    ('What totally made-up word do you use at home that your household takes completely seriously?', '{}'::text[], 1),
    ('Describe the last time you confidently waved back at someone who wasn''t waving at you.', '{}'::text[], 1),
    ('What skill have you been pretending to have for years but still couldn''t execute if called upon today?', '{}'::text[], 1),
    ('If a documentary crew followed you around for one week, what would be the most awkward scene?', '{}'::text[], 1),
    ('What''s your most embarrassing "I thought I was on mute" or "I thought my camera was off" story?', '{}'::text[], 1),
    ('What''s the most dramatic way you''ve ever reacted to something that was 100% your fault?', '{}'::text[], 2),
    ('If you had to audition for a reality TV show with whatever talent you have right now, what would you do?', '{creative}'::text[], 1),
    ('What''s a food combination you eat in private that you would never admit to ordering in a restaurant?', '{food}'::text[], 1),
    ('When was the last time you laughed so hard at something completely inappropriate?', '{}'::text[], 2),
    ('What''s the most elaborate excuse you''ve ever constructed to avoid doing something simple?', '{}'::text[], 1),
    ('What''s a deeply held opinion about something trivial — like the correct way to load a dishwasher — that you would argue about at length?', '{}'::text[], 2),
    -- Deep
    ('Is there a belief you held for years that you''ve completely reversed on? What changed?', '{}'::text[], 4),
    ('What''s a version of yourself from five years ago that would surprise current you?', '{}'::text[], 4),
    ('When did you last feel genuinely proud of yourself, and did you let yourself sit with that feeling?', '{}'::text[], 4),
    ('What''s a fear you''ve never said out loud to anyone?', '{}'::text[], 5),
    ('If the people who love you most were asked to describe your blind spot, what do you think they''d say?', '{}'::text[], 5),
    ('What does "home" mean to you right now, and does any place actually feel like it?', '{}'::text[], 4),
    ('What are you currently tolerating in your life that you know you''ll eventually have to address?', '{}'::text[], 4),
    ('Is there something you''ve forgiven someone for but haven''t fully let go of?', '{relationships}'::text[], 5),
    ('What''s a chapter of your life you rarely talk about but shaped who you are significantly?', '{}'::text[], 5),
    ('What would you do differently if you knew no one would judge you for it?', '{}'::text[], 4),
    ('What relationship in your life has surprised you the most — either by growing or fading?', '{relationships}'::text[], 4),
    ('What''s something you want that you''ve talked yourself out of wanting because it feels too big?', '{}'::text[], 4),
    ('When you''re struggling, what''s your first instinct — reach out or go quiet?', '{}'::text[], 4),
    ('What''s a compliment you received that you still think about years later?', '{}'::text[], 3),
    ('What does your relationship with money reveal about your deeper values?', '{money}'::text[], 4),
    ('If you could send one message to your 16-year-old self, what would actually help them — not just reassure them?', '{}'::text[], 4),
    ('What''s something you wish people understood about you without you having to explain it?', '{}'::text[], 4),
    ('What''s the most important thing a relationship — friendship or romantic — has taught you about yourself?', '{relationships}'::text[], 4),
    -- Personal
    ('What''s something you''re proud of that you''ve never told anyone?', '{}'::text[], 3),
    ('What''s a habit or ritual that''s been quietly keeping you sane lately?', '{wellness}'::text[], 3),
    ('What''s something on your mind right now that you haven''t found the right moment to bring up with someone?', '{}'::text[], 3),
    ('What''s the last thing that genuinely excited you — not obligated you, but excited you?', '{}'::text[], 2),
    ('When was the last time you cried, and was it for the reason you''d admit first?', '{}'::text[], 4),
    ('What are you working on right now that nobody knows about?', '{}'::text[], 3),
    ('What''s a small act of kindness someone did for you that you still think about?', '{}'::text[], 2),
    ('What''s a decision you made recently that was entirely for yourself and no one else?', '{}'::text[], 3),
    ('What''s something you''ve been meaning to start — or stop — for longer than a year?', '{}'::text[], 3),
    ('What does your ideal Saturday morning look like, and when did you last actually have one?', '{wellness}'::text[], 2),
    ('What''s a moment from this past month that quietly meant a lot to you?', '{}'::text[], 3),
    ('Who do you call when something goes wrong? Who do you call when something goes right?', '{relationships}'::text[], 3),
    ('What''s something you''re in the middle of right now — creatively, professionally, personally — that you''re not ready to talk about publicly?', '{creative}'::text[], 3),
    ('What''s the most honest thing you could say about where you are in life right now?', '{}'::text[], 4),
    ('What''s a place you''ve been that changed how you see things?', '{travel}'::text[], 3),
    ('When do you feel most like yourself?', '{}'::text[], 3),
    ('What''s something you''ve given up on that you still grieve a little?', '{}'::text[], 4),
    ('What does your relationship with your phone say about what you''re actually looking for?', '{wellness}'::text[], 3)
  ) AS v(text, topics, depth)
 WHERE q.text = v.text;
