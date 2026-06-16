// Per-language overrides for the seed questions, keyed by their English text.
//
// Questions are DB content seeded in English. We key by text (not id) so the
// lookup works regardless of the row's UUID — the dev DB's question rows don't
// all carry the Phase 2 stable ids, but their English text is identical. The
// app shows the override for the active language, else the English text. Only
// NL is translated (ES/DE/FR fall back to English, like the rest of the UI).
//
// Keys must match the DB text exactly. New/unknown questions show English.
export const QUESTION_TRANSLATIONS: Record<string, Record<string, string>> = {
  // Funny
  "What's the most embarrassing autocorrect fail you've sent to the wrong person?": { nl: 'Wat is de meest gênante autocorrectie-blunder die je naar de verkeerde persoon hebt gestuurd?' },
  'If you had to explain what you do for work using only emojis, what would you send?': { nl: "Als je je werk alleen met emoji's mocht uitleggen, wat zou je dan sturen?" },
  "What's the weirdest thing you've googled in the last week that you'd be mortified if someone saw?": { nl: 'Wat is het raarste dat je de afgelopen week hebt gegoogeld en waarvoor je je dood zou schamen als iemand het zag?' },
  "What's a completely irrational hill you're willing to die on?": { nl: 'Welk volledig irrationeel standpunt verdedig je tot het bittere eind?' },
  "What's the most ridiculous lie you told as a kid to get out of trouble?": { nl: 'Wat is de meest belachelijke leugen die je als kind vertelde om onder problemen uit te komen?' },
  'If your life had a laugh track, what situation would have triggered it most this week?': { nl: 'Als je leven een lachband had, welke situatie zou die deze week het vaakst hebben afgespeeld?' },
  'What\'s your personal worst "reply all" email disaster or closest call?': { nl: 'Wat is jouw ergste allen-beantwoorden-emailramp of bijna-ramp?' },
  'What totally made-up word do you use at home that your household takes completely seriously?': { nl: 'Welk volledig verzonnen woord gebruik je thuis dat je huisgenoten volkomen serieus nemen?' },
  "Describe the last time you confidently waved back at someone who wasn't waving at you.": { nl: 'Beschrijf de laatste keer dat je vol zelfvertrouwen terugzwaaide naar iemand die niet naar jou zwaaide.' },
  "What skill have you been pretending to have for years but still couldn't execute if called upon today?": { nl: 'Welke vaardigheid doe je al jaren alsof je die hebt, maar zou je vandaag nog steeds niet kunnen uitvoeren?' },
  'If a documentary crew followed you around for one week, what would be the most awkward scene?': { nl: 'Als een documentaireploeg je een week zou volgen, wat zou dan de meest ongemakkelijke scène zijn?' },
  'What\'s your most embarrassing "I thought I was on mute" or "I thought my camera was off" story?': { nl: 'Wat is je meest gênante moment waarop je dacht dat je gemute was of dat je camera uit stond?' },
  "What's the most dramatic way you've ever reacted to something that was 100% your fault?": { nl: 'Wat is de meest dramatische manier waarop je ooit reageerde op iets dat 100% jouw schuld was?' },
  'If you had to audition for a reality TV show with whatever talent you have right now, what would you do?': { nl: 'Als je auditie moest doen voor een realityshow met het talent dat je nu hebt, wat zou je dan doen?' },
  "What's a food combination you eat in private that you would never admit to ordering in a restaurant?": { nl: 'Welke etenscombinatie eet je stiekem thuis die je nooit in een restaurant zou durven bestellen?' },
  'When was the last time you laughed so hard at something completely inappropriate?': { nl: 'Wanneer moest je voor het laatst keihard lachen om iets totaal ongepasts?' },
  "What's the most elaborate excuse you've ever constructed to avoid doing something simple?": { nl: 'Wat is het meest uitgebreide excuus dat je ooit hebt verzonnen om iets simpels te ontwijken?' },
  "What's a deeply held opinion about something trivial — like the correct way to load a dishwasher — that you would argue about at length?": { nl: 'Welke diepgewortelde mening over iets onbenulligs — zoals de juiste manier om de vaatwasser in te ruimen — zou je urenlang verdedigen?' },
  // Deep
  "Is there a belief you held for years that you've completely reversed on? What changed?": { nl: 'Is er een overtuiging die je jarenlang had en waarop je volledig bent teruggekomen? Wat veranderde er?' },
  "What's a version of yourself from five years ago that would surprise current you?": { nl: 'Welke versie van jezelf van vijf jaar geleden zou de huidige jij verrassen?' },
  'When did you last feel genuinely proud of yourself, and did you let yourself sit with that feeling?': { nl: 'Wanneer was je voor het laatst echt trots op jezelf, en stond je jezelf toe om bij dat gevoel stil te staan?' },
  "What's a fear you've never said out loud to anyone?": { nl: 'Welke angst heb je nog nooit hardop tegen iemand uitgesproken?' },
  "If the people who love you most were asked to describe your blind spot, what do you think they'd say?": { nl: 'Als de mensen die het meest van je houden je blinde vlek moesten beschrijven, wat denk je dat ze zouden zeggen?' },
  'What does "home" mean to you right now, and does any place actually feel like it?': { nl: 'Wat betekent thuis voor jou op dit moment, en voelt een plek ook echt zo?' },
  "What are you currently tolerating in your life that you know you'll eventually have to address?": { nl: 'Wat tolereer je momenteel in je leven waarvan je weet dat je het ooit zult moeten aanpakken?' },
  "Is there something you've forgiven someone for but haven't fully let go of?": { nl: 'Is er iets wat je iemand hebt vergeven maar nog niet helemaal hebt losgelaten?' },
  "What's a chapter of your life you rarely talk about but shaped who you are significantly?": { nl: 'Welk hoofdstuk van je leven bespreek je zelden, maar heeft het je sterk gevormd?' },
  'What would you do differently if you knew no one would judge you for it?': { nl: 'Wat zou je anders doen als je wist dat niemand je erom zou veroordelen?' },
  'What relationship in your life has surprised you the most — either by growing or fading?': { nl: 'Welke relatie in je leven heeft je het meest verrast — door te groeien of te vervagen?' },
  "What's something you want that you've talked yourself out of wanting because it feels too big?": { nl: 'Wat wil je graag, maar heb je jezelf aangepraat niet te willen omdat het te groot voelt?' },
  "When you're struggling, what's your first instinct — reach out or go quiet?": { nl: 'Als je het moeilijk hebt, wat is dan je eerste reactie — contact zoeken of je terugtrekken?' },
  "What's a compliment you received that you still think about years later?": { nl: 'Welk compliment dat je ooit kreeg, denk je jaren later nog steeds aan?' },
  'What does your relationship with money reveal about your deeper values?': { nl: 'Wat onthult jouw relatie met geld over je diepere waarden?' },
  'If you could send one message to your 16-year-old self, what would actually help them — not just reassure them?': { nl: 'Als je één bericht aan je 16-jarige zelf kon sturen, wat zou hen echt helpen — niet alleen geruststellen?' },
  "What's something you wish people understood about you without you having to explain it?": { nl: 'Wat zou je willen dat mensen over jou begrepen zonder dat je het hoeft uit te leggen?' },
  "What's the most important thing a relationship — friendship or romantic — has taught you about yourself?": { nl: 'Wat is het belangrijkste dat een relatie — vriendschappelijk of romantisch — je over jezelf heeft geleerd?' },
  // Personal
  "What's something you're proud of that you've never told anyone?": { nl: 'Waar ben je trots op dat je nog nooit aan iemand hebt verteld?' },
  "What's a habit or ritual that's been quietly keeping you sane lately?": { nl: 'Welke gewoonte of welk ritueel houdt je de laatste tijd stilletjes overeind?' },
  "What's something on your mind right now that you haven't found the right moment to bring up with someone?": { nl: 'Wat houdt je op dit moment bezig waarvoor je nog niet het juiste moment hebt gevonden om het met iemand te bespreken?' },
  "What's the last thing that genuinely excited you — not obligated you, but excited you?": { nl: 'Wat was het laatste dat je echt enthousiast maakte — niet wat moest, maar wat je oprecht opwond?' },
  "When was the last time you cried, and was it for the reason you'd admit first?": { nl: 'Wanneer huilde je voor het laatst, en was het om de reden die je als eerste zou toegeven?' },
  'What are you working on right now that nobody knows about?': { nl: 'Waar werk je op dit moment aan waar niemand van weet?' },
  "What's a small act of kindness someone did for you that you still think about?": { nl: 'Welke kleine vriendelijke daad van iemand denk je nog steeds aan?' },
  "What's a decision you made recently that was entirely for yourself and no one else?": { nl: 'Welke beslissing nam je onlangs die volledig voor jezelf was en niemand anders?' },
  "What's something you've been meaning to start — or stop — for longer than a year?": { nl: 'Wat ben je al langer dan een jaar van plan te beginnen — of te stoppen?' },
  'What does your ideal Saturday morning look like, and when did you last actually have one?': { nl: 'Hoe ziet jouw ideale zaterdagochtend eruit, en wanneer had je die voor het laatst echt?' },
  "What's a moment from this past month that quietly meant a lot to you?": { nl: 'Welk moment van de afgelopen maand betekende stiekem veel voor je?' },
  'Who do you call when something goes wrong? Who do you call when something goes right?': { nl: 'Wie bel je als er iets misgaat? Wie bel je als er iets goed gaat?' },
  "What's something you're in the middle of right now — creatively, professionally, personally — that you're not ready to talk about publicly?": { nl: 'Waar zit je op dit moment middenin — creatief, professioneel, persoonlijk — waarover je nog niet klaar bent om openlijk te praten?' },
  "What's the most honest thing you could say about where you are in life right now?": { nl: 'Wat is het eerlijkste dat je kunt zeggen over waar je nu in je leven staat?' },
  "What's a place you've been that changed how you see things?": { nl: 'Welke plek die je hebt bezocht, veranderde hoe je naar dingen kijkt?' },
  'When do you feel most like yourself?': { nl: 'Wanneer voel je je het meest jezelf?' },
  "What's something you've given up on that you still grieve a little?": { nl: 'Wat heb je opgegeven waar je nog steeds een beetje om rouwt?' },
  "What does your relationship with your phone say about what you're actually looking for?": { nl: 'Wat zegt jouw relatie met je telefoon over waar je eigenlijk naar op zoek bent?' },
};
