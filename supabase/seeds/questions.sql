-- Seed: 54 questions across funny, deep, and personal categories.
--
-- Phase 2 (personalization) gives every question STABLE ids + a topic/depth
-- tag so rotate_daily_questions() can honor onboarding answers. text_i18n holds
-- per-language overrides of the (English) `text`; the app shows
-- text_i18n[lang] ?? text. EN + NL are full; ES/DE/FR fall back to EN.
-- The insert is idempotent (ON CONFLICT (id) DO UPDATE).

INSERT INTO public.questions (id, text, category, topics, depth, text_i18n) VALUES
-- ============================================================
-- Funny
-- ============================================================
('00000000-0000-4000-8000-000000000001', 'What''s the most embarrassing autocorrect fail you''ve sent to the wrong person?', 'funny', '{}', 1, '{"nl":"Wat is de meest gênante autocorrectie-blunder die je naar de verkeerde persoon hebt gestuurd?"}'::jsonb),
('00000000-0000-4000-8000-000000000002', 'If you had to explain what you do for work using only emojis, what would you send?', 'funny', '{}', 1, '{"nl":"Als je je werk alleen met emoji''s mocht uitleggen, wat zou je dan sturen?"}'::jsonb),
('00000000-0000-4000-8000-000000000003', 'What''s the weirdest thing you''ve googled in the last week that you''d be mortified if someone saw?', 'funny', '{}', 1, '{"nl":"Wat is het raarste dat je de afgelopen week hebt gegoogeld en waarvoor je je dood zou schamen als iemand het zag?"}'::jsonb),
('00000000-0000-4000-8000-000000000004', 'What''s a completely irrational hill you''re willing to die on?', 'funny', '{}', 2, '{"nl":"Welk volledig irrationeel standpunt verdedig je tot het bittere eind?"}'::jsonb),
('00000000-0000-4000-8000-000000000005', 'What''s the most ridiculous lie you told as a kid to get out of trouble?', 'funny', '{}', 2, '{"nl":"Wat is de meest belachelijke leugen die je als kind vertelde om onder problemen uit te komen?"}'::jsonb),
('00000000-0000-4000-8000-000000000006', 'If your life had a laugh track, what situation would have triggered it most this week?', 'funny', '{}', 1, '{"nl":"Als je leven een lachband had, welke situatie zou die deze week het vaakst hebben afgespeeld?"}'::jsonb),
('00000000-0000-4000-8000-000000000007', 'What''s your personal worst "reply all" email disaster or closest call?', 'funny', '{}', 1, '{"nl":"Wat is jouw ergste allen-beantwoorden-emailramp of bijna-ramp?"}'::jsonb),
('00000000-0000-4000-8000-000000000008', 'What totally made-up word do you use at home that your household takes completely seriously?', 'funny', '{}', 1, '{"nl":"Welk volledig verzonnen woord gebruik je thuis dat je huisgenoten volkomen serieus nemen?"}'::jsonb),
('00000000-0000-4000-8000-000000000009', 'Describe the last time you confidently waved back at someone who wasn''t waving at you.', 'funny', '{}', 1, '{"nl":"Beschrijf de laatste keer dat je vol zelfvertrouwen terugzwaaide naar iemand die niet naar jou zwaaide."}'::jsonb),
('00000000-0000-4000-8000-000000000010', 'What skill have you been pretending to have for years but still couldn''t execute if called upon today?', 'funny', '{}', 1, '{"nl":"Welke vaardigheid doe je al jaren alsof je die hebt, maar zou je vandaag nog steeds niet kunnen uitvoeren?"}'::jsonb),
('00000000-0000-4000-8000-000000000011', 'If a documentary crew followed you around for one week, what would be the most awkward scene?', 'funny', '{}', 1, '{"nl":"Als een documentaireploeg je een week zou volgen, wat zou dan de meest ongemakkelijke scène zijn?"}'::jsonb),
('00000000-0000-4000-8000-000000000012', 'What''s your most embarrassing "I thought I was on mute" or "I thought my camera was off" story?', 'funny', '{}', 1, '{"nl":"Wat is je meest gênante moment waarop je dacht dat je gemute was of dat je camera uit stond?"}'::jsonb),
('00000000-0000-4000-8000-000000000013', 'What''s the most dramatic way you''ve ever reacted to something that was 100% your fault?', 'funny', '{}', 2, '{"nl":"Wat is de meest dramatische manier waarop je ooit reageerde op iets dat 100% jouw schuld was?"}'::jsonb),
('00000000-0000-4000-8000-000000000014', 'If you had to audition for a reality TV show with whatever talent you have right now, what would you do?', 'funny', '{creative}', 1, '{"nl":"Als je auditie moest doen voor een realityshow met het talent dat je nu hebt, wat zou je dan doen?"}'::jsonb),
('00000000-0000-4000-8000-000000000015', 'What''s a food combination you eat in private that you would never admit to ordering in a restaurant?', 'funny', '{food}', 1, '{"nl":"Welke etenscombinatie eet je stiekem thuis die je nooit in een restaurant zou durven bestellen?"}'::jsonb),
('00000000-0000-4000-8000-000000000016', 'When was the last time you laughed so hard at something completely inappropriate?', 'funny', '{}', 2, '{"nl":"Wanneer moest je voor het laatst keihard lachen om iets totaal ongepasts?"}'::jsonb),
('00000000-0000-4000-8000-000000000017', 'What''s the most elaborate excuse you''ve ever constructed to avoid doing something simple?', 'funny', '{}', 1, '{"nl":"Wat is het meest uitgebreide excuus dat je ooit hebt verzonnen om iets simpels te ontwijken?"}'::jsonb),
('00000000-0000-4000-8000-000000000018', 'What''s a deeply held opinion about something trivial — like the correct way to load a dishwasher — that you would argue about at length?', 'funny', '{}', 2, '{"nl":"Welke diepgewortelde mening over iets onbenulligs — zoals de juiste manier om de vaatwasser in te ruimen — zou je urenlang verdedigen?"}'::jsonb),
-- ============================================================
-- Deep
-- ============================================================
('00000000-0000-4000-8000-000000000019', 'Is there a belief you held for years that you''ve completely reversed on? What changed?', 'deep', '{}', 4, '{"nl":"Is er een overtuiging die je jarenlang had en waarop je volledig bent teruggekomen? Wat veranderde er?"}'::jsonb),
('00000000-0000-4000-8000-000000000020', 'What''s a version of yourself from five years ago that would surprise current you?', 'deep', '{}', 4, '{"nl":"Welke versie van jezelf van vijf jaar geleden zou de huidige jij verrassen?"}'::jsonb),
('00000000-0000-4000-8000-000000000021', 'When did you last feel genuinely proud of yourself, and did you let yourself sit with that feeling?', 'deep', '{}', 4, '{"nl":"Wanneer was je voor het laatst echt trots op jezelf, en stond je jezelf toe om bij dat gevoel stil te staan?"}'::jsonb),
('00000000-0000-4000-8000-000000000022', 'What''s a fear you''ve never said out loud to anyone?', 'deep', '{}', 5, '{"nl":"Welke angst heb je nog nooit hardop tegen iemand uitgesproken?"}'::jsonb),
('00000000-0000-4000-8000-000000000023', 'If the people who love you most were asked to describe your blind spot, what do you think they''d say?', 'deep', '{}', 5, '{"nl":"Als de mensen die het meest van je houden je blinde vlek moesten beschrijven, wat denk je dat ze zouden zeggen?"}'::jsonb),
('00000000-0000-4000-8000-000000000024', 'What does "home" mean to you right now, and does any place actually feel like it?', 'deep', '{}', 4, '{"nl":"Wat betekent thuis voor jou op dit moment, en voelt een plek ook echt zo?"}'::jsonb),
('00000000-0000-4000-8000-000000000025', 'What are you currently tolerating in your life that you know you''ll eventually have to address?', 'deep', '{}', 4, '{"nl":"Wat tolereer je momenteel in je leven waarvan je weet dat je het ooit zult moeten aanpakken?"}'::jsonb),
('00000000-0000-4000-8000-000000000026', 'Is there something you''ve forgiven someone for but haven''t fully let go of?', 'deep', '{relationships}', 5, '{"nl":"Is er iets wat je iemand hebt vergeven maar nog niet helemaal hebt losgelaten?"}'::jsonb),
('00000000-0000-4000-8000-000000000027', 'What''s a chapter of your life you rarely talk about but shaped who you are significantly?', 'deep', '{}', 5, '{"nl":"Welk hoofdstuk van je leven bespreek je zelden, maar heeft het je sterk gevormd?"}'::jsonb),
('00000000-0000-4000-8000-000000000028', 'What would you do differently if you knew no one would judge you for it?', 'deep', '{}', 4, '{"nl":"Wat zou je anders doen als je wist dat niemand je erom zou veroordelen?"}'::jsonb),
('00000000-0000-4000-8000-000000000029', 'What relationship in your life has surprised you the most — either by growing or fading?', 'deep', '{relationships}', 4, '{"nl":"Welke relatie in je leven heeft je het meest verrast — door te groeien of te vervagen?"}'::jsonb),
('00000000-0000-4000-8000-000000000030', 'What''s something you want that you''ve talked yourself out of wanting because it feels too big?', 'deep', '{}', 4, '{"nl":"Wat wil je graag, maar heb je jezelf aangepraat niet te willen omdat het te groot voelt?"}'::jsonb),
('00000000-0000-4000-8000-000000000031', 'When you''re struggling, what''s your first instinct — reach out or go quiet?', 'deep', '{}', 4, '{"nl":"Als je het moeilijk hebt, wat is dan je eerste reactie — contact zoeken of je terugtrekken?"}'::jsonb),
('00000000-0000-4000-8000-000000000032', 'What''s a compliment you received that you still think about years later?', 'deep', '{}', 3, '{"nl":"Welk compliment dat je ooit kreeg, denk je jaren later nog steeds aan?"}'::jsonb),
('00000000-0000-4000-8000-000000000033', 'What does your relationship with money reveal about your deeper values?', 'deep', '{money}', 4, '{"nl":"Wat onthult jouw relatie met geld over je diepere waarden?"}'::jsonb),
('00000000-0000-4000-8000-000000000034', 'If you could send one message to your 16-year-old self, what would actually help them — not just reassure them?', 'deep', '{}', 4, '{"nl":"Als je één bericht aan je 16-jarige zelf kon sturen, wat zou hen echt helpen — niet alleen geruststellen?"}'::jsonb),
('00000000-0000-4000-8000-000000000035', 'What''s something you wish people understood about you without you having to explain it?', 'deep', '{}', 4, '{"nl":"Wat zou je willen dat mensen over jou begrepen zonder dat je het hoeft uit te leggen?"}'::jsonb),
('00000000-0000-4000-8000-000000000036', 'What''s the most important thing a relationship — friendship or romantic — has taught you about yourself?', 'deep', '{relationships}', 4, '{"nl":"Wat is het belangrijkste dat een relatie — vriendschappelijk of romantisch — je over jezelf heeft geleerd?"}'::jsonb),
-- ============================================================
-- Personal
-- ============================================================
('00000000-0000-4000-8000-000000000037', 'What''s something you''re proud of that you''ve never told anyone?', 'personal', '{}', 3, '{"nl":"Waar ben je trots op dat je nog nooit aan iemand hebt verteld?"}'::jsonb),
('00000000-0000-4000-8000-000000000038', 'What''s a habit or ritual that''s been quietly keeping you sane lately?', 'personal', '{wellness}', 3, '{"nl":"Welke gewoonte of welk ritueel houdt je de laatste tijd stilletjes overeind?"}'::jsonb),
('00000000-0000-4000-8000-000000000039', 'What''s something on your mind right now that you haven''t found the right moment to bring up with someone?', 'personal', '{}', 3, '{"nl":"Wat houdt je op dit moment bezig waarvoor je nog niet het juiste moment hebt gevonden om het met iemand te bespreken?"}'::jsonb),
('00000000-0000-4000-8000-000000000040', 'What''s the last thing that genuinely excited you — not obligated you, but excited you?', 'personal', '{}', 2, '{"nl":"Wat was het laatste dat je echt enthousiast maakte — niet wat moest, maar wat je oprecht opwond?"}'::jsonb),
('00000000-0000-4000-8000-000000000041', 'When was the last time you cried, and was it for the reason you''d admit first?', 'personal', '{}', 4, '{"nl":"Wanneer huilde je voor het laatst, en was het om de reden die je als eerste zou toegeven?"}'::jsonb),
('00000000-0000-4000-8000-000000000042', 'What are you working on right now that nobody knows about?', 'personal', '{}', 3, '{"nl":"Waar werk je op dit moment aan waar niemand van weet?"}'::jsonb),
('00000000-0000-4000-8000-000000000043', 'What''s a small act of kindness someone did for you that you still think about?', 'personal', '{}', 2, '{"nl":"Welke kleine vriendelijke daad van iemand denk je nog steeds aan?"}'::jsonb),
('00000000-0000-4000-8000-000000000044', 'What''s a decision you made recently that was entirely for yourself and no one else?', 'personal', '{}', 3, '{"nl":"Welke beslissing nam je onlangs die volledig voor jezelf was en niemand anders?"}'::jsonb),
('00000000-0000-4000-8000-000000000045', 'What''s something you''ve been meaning to start — or stop — for longer than a year?', 'personal', '{}', 3, '{"nl":"Wat ben je al langer dan een jaar van plan te beginnen — of te stoppen?"}'::jsonb),
('00000000-0000-4000-8000-000000000046', 'What does your ideal Saturday morning look like, and when did you last actually have one?', 'personal', '{wellness}', 2, '{"nl":"Hoe ziet jouw ideale zaterdagochtend eruit, en wanneer had je die voor het laatst echt?"}'::jsonb),
('00000000-0000-4000-8000-000000000047', 'What''s a moment from this past month that quietly meant a lot to you?', 'personal', '{}', 3, '{"nl":"Welk moment van de afgelopen maand betekende stiekem veel voor je?"}'::jsonb),
('00000000-0000-4000-8000-000000000048', 'Who do you call when something goes wrong? Who do you call when something goes right?', 'personal', '{relationships}', 3, '{"nl":"Wie bel je als er iets misgaat? Wie bel je als er iets goed gaat?"}'::jsonb),
('00000000-0000-4000-8000-000000000049', 'What''s something you''re in the middle of right now — creatively, professionally, personally — that you''re not ready to talk about publicly?', 'personal', '{creative}', 3, '{"nl":"Waar zit je op dit moment middenin — creatief, professioneel, persoonlijk — waarover je nog niet klaar bent om openlijk te praten?"}'::jsonb),
('00000000-0000-4000-8000-000000000050', 'What''s the most honest thing you could say about where you are in life right now?', 'personal', '{}', 4, '{"nl":"Wat is het eerlijkste dat je kunt zeggen over waar je nu in je leven staat?"}'::jsonb),
('00000000-0000-4000-8000-000000000051', 'What''s a place you''ve been that changed how you see things?', 'personal', '{travel}', 3, '{"nl":"Welke plek die je hebt bezocht, veranderde hoe je naar dingen kijkt?"}'::jsonb),
('00000000-0000-4000-8000-000000000052', 'When do you feel most like yourself?', 'personal', '{}', 3, '{"nl":"Wanneer voel je je het meest jezelf?"}'::jsonb),
('00000000-0000-4000-8000-000000000053', 'What''s something you''ve given up on that you still grieve a little?', 'personal', '{}', 4, '{"nl":"Wat heb je opgegeven waar je nog steeds een beetje om rouwt?"}'::jsonb),
('00000000-0000-4000-8000-000000000054', 'What does your relationship with your phone say about what you''re actually looking for?', 'personal', '{wellness}', 3, '{"nl":"Wat zegt jouw relatie met je telefoon over waar je eigenlijk naar op zoek bent?"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  text      = EXCLUDED.text,
  category  = EXCLUDED.category,
  topics    = EXCLUDED.topics,
  depth     = EXCLUDED.depth,
  text_i18n = EXCLUDED.text_i18n;
