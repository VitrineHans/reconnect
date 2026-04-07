import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius, shadows } from '../../theme/tokens';

// ── Questions (fun → personal → deeper) ──────────────────────────────────────

const QUESTIONS = [
  {
    key: 'personality',
    prompt: 'Pick your vibe ✨',
    subtitle: 'Choose your character',
    type: 'choice' as const,
    affirmation: ['Love it! That\'s so you 💅', 'Great pick!', 'Iconic ⚡', 'Vibes confirmed 🌿'],
    options: [
      { label: 'The funny one', value: 'funny',     emoji: '😄', color: colors.yellow },
      { label: 'The deep thinker', value: 'thinker', emoji: '🤔', color: colors.sky },
      { label: 'The energiser', value: 'energiser',  emoji: '⚡', color: colors.primary },
      { label: 'The calm one', value: 'calm',         emoji: '🌿', color: colors.mint },
    ],
  },
  {
    key: 'interests',
    prompt: 'What do you love? 💛',
    subtitle: 'Pick all that apply',
    type: 'multi' as const,
    affirmation: ['Nice taste!', 'Good mix!', 'You\'re interesting 👀', 'Love that!'],
    options: [
      { label: '🎵 Music',       value: 'music' },
      { label: '🏃 Sport',       value: 'sport' },
      { label: '✈️ Travel',      value: 'travel' },
      { label: '🍕 Food',        value: 'food' },
      { label: '🎮 Gaming',      value: 'gaming' },
      { label: '📚 Reading',     value: 'reading' },
      { label: '🎨 Creative',    value: 'creative' },
      { label: '🎬 Film & TV',   value: 'film' },
      { label: '🌱 Wellness',    value: 'wellness' },
      { label: '🐾 Animals',     value: 'animals' },
    ],
  },
  {
    key: 'age_range',
    prompt: 'How old are you? 🎂',
    subtitle: 'Just between us',
    type: 'choice' as const,
    affirmation: ['Got it! 🙌', 'Noted!', 'Perfect!', 'Sweet!'],
    options: [
      { label: 'Under 18', value: 'u18',   emoji: '🌱', color: colors.mint },
      { label: '18 – 24',  value: '18-24', emoji: '🎓', color: colors.yellow },
      { label: '25 – 34',  value: '25-34', emoji: '💼', color: colors.primary },
      { label: '35 – 44',  value: '35-44', emoji: '🌟', color: colors.sky },
      { label: '45+',      value: '45+',   emoji: '👑', color: colors.lilac },
    ],
  },
  {
    key: 'country',
    prompt: 'Where do you live? 🌍',
    subtitle: 'So we can ask relevant questions',
    type: 'choice' as const,
    affirmation: ['Great place! 🗺️', 'Noted!', 'Lovely!', 'Cool!'],
    options: [
      { label: '🇳🇱 Netherlands', value: 'nl', emoji: '🇳🇱', color: colors.sky },
      { label: '🇧🇪 Belgium',     value: 'be', emoji: '🇧🇪', color: colors.yellow },
      { label: '🇩🇪 Germany',     value: 'de', emoji: '🇩🇪', color: colors.primary },
      { label: '🇬🇧 UK',          value: 'uk', emoji: '🇬🇧', color: colors.mint },
      { label: '🇺🇸 USA',         value: 'us', emoji: '🇺🇸', color: colors.sky },
      { label: '🌐 Somewhere else', value: 'other', emoji: '🌐', color: colors.lilac },
    ],
  },
  {
    key: 'life_stage',
    prompt: 'What\'s your life like right now?',
    subtitle: 'No judgment here',
    type: 'choice' as const,
    affirmation: ['Sounds great!', 'Love it!', 'Respect 🙌', 'Exciting times!'],
    options: [
      { label: 'Studying',      value: 'studying',  emoji: '🎓', color: colors.yellow },
      { label: 'Working',       value: 'working',   emoji: '💼', color: colors.primary },
      { label: 'Parent life',   value: 'parent',    emoji: '👶', color: colors.mint },
      { label: 'Figuring it out', value: 'exploring', emoji: '🌱', color: colors.sky },
    ],
  },
  {
    key: 'depth_comfort',
    prompt: 'How deep can questions get? 🤿',
    subtitle: 'Be honest — there\'s no wrong answer',
    type: 'scale' as const,
    min: 1,
    max: 5,
    affirmation: ['Perfect for you!', 'Got it!', 'Noted!', 'We\'ll match that!'],
    scaleLabels: { 1: 'Keep it light', 5: 'Go deep' },
  },
  {
    key: 'off_limits',
    prompt: 'Anything off-limits?',
    subtitle: 'We\'ll skip these topics',
    type: 'multi' as const,
    affirmation: ['Respect. We\'ve got you 🛡️', 'Noted!', 'Of course!', 'Totally fair!'],
    options: [
      { label: '👨‍👩‍👧 Family',        value: 'family' },
      { label: '💰 Money',          value: 'money' },
      { label: '❤️ Relationships',  value: 'relationships' },
      { label: '🏥 Health',         value: 'health' },
      { label: '🙅 Nothing!',       value: 'none' },
    ],
  },
] as const;

type AnswerValue = string | string[] | number;

// ── Progress dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i < current && styles.dotDone,
            i === current && styles.dotActive,
          ]}
        />
      ))}
    </View>
  );
}

// ── Micro-affirmation ─────────────────────────────────────────────────────────

function Affirmation({ text, visible }: { text: string; visible: boolean }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(opacity, { toValue: 1, useNativeDriver: true, tension: 80, friction: 8 }),
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 8 }),
      ]).start();
    } else {
      opacity.setValue(0);
      translateY.setValue(8);
    }
  }, [visible, text]);

  return (
    <Animated.View style={[styles.affirmation, { opacity, transform: [{ translateY }] }]}>
      <Text style={styles.affirmationText}>{text}</Text>
    </Animated.View>
  );
}

// ── Choice tile (2-col grid) ──────────────────────────────────────────────────

function ChoiceTile({
  label, emoji, color, selected, onPress,
}: {
  label: string; emoji?: string; color?: string; selected: boolean; onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
    onPress();
  };

  const bg = selected ? (color ?? colors.primary) : colors.surface;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={handlePress} style={styles.tileWrapper}>
      <Animated.View
        style={[
          styles.tile,
          { backgroundColor: bg, transform: [{ scale }] },
          selected && shadows.emberGlow,
        ]}
      >
        {emoji && <Text style={styles.tileEmoji}>{emoji}</Text>}
        <Text style={[styles.tileLabel, selected && styles.tileLabelSelected]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Chip (pill multi-select) ──────────────────────────────────────────────────

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.92, useNativeDriver: true, tension: 300, friction: 10 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <Animated.View style={[styles.chip, selected && styles.chipSelected, { transform: [{ scale }] }]}>
        <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── Scale selector ────────────────────────────────────────────────────────────

function ScaleSelector({
  min, max, value, labels, onChange,
}: {
  min: number; max: number; value: number | undefined; labels?: { [k: number]: string }; onChange: (n: number) => void;
}) {
  return (
    <View>
      <View style={styles.scaleRow}>
        {Array.from({ length: max - min + 1 }, (_, i) => i + min).map((n) => {
          const selected = value === n;
          return (
            <TouchableOpacity
              key={n}
              activeOpacity={0.8}
              onPress={() => onChange(n)}
              style={[styles.scaleBtn, selected && styles.scaleBtnSelected]}
            >
              <Text style={[styles.scaleBtnText, selected && styles.scaleBtnTextSelected]}>{n}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {labels && (
        <View style={styles.scaleLabelsRow}>
          <Text style={styles.scaleLabelText}>{labels[min]}</Text>
          <Text style={styles.scaleLabelText}>{labels[max]}</Text>
        </View>
      )}
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function QuestionnaireScreen() {
  const { session } = useSession();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(false);
  const [initialising, setInitialising] = useState(true);
  const [showAffirmation, setShowAffirmation] = useState(false);
  const [affirmationText, setAffirmationText] = useState('');

  // Pre-load existing answers so the screen never resets on revisit
  useEffect(() => {
    if (!session?.user?.id) { setInitialising(false); return; }
    supabase
      .from('profiles')
      .select('onboarding_answers')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        if (data?.onboarding_answers) {
          setAnswers(data.onboarding_answers as Record<string, AnswerValue>);
        }
        setInitialising(false);
      });
  }, [session?.user?.id]);

  const slideAnim = useRef(new Animated.Value(0)).current;

  const q = QUESTIONS[step];
  const isLast = step === QUESTIONS.length - 1;
  const currentAnswer = answers[q.key];
  const hasAnswer = currentAnswer !== undefined &&
    (Array.isArray(currentAnswer) ? currentAnswer.length > 0 : currentAnswer !== '');

  const triggerAffirmation = (key: string) => {
    const q = QUESTIONS.find(q => q.key === key);
    if (!q?.affirmation) return;
    const texts = q.affirmation as readonly string[];
    const text = texts[Math.floor(Math.random() * texts.length)];
    setAffirmationText(text);
    setShowAffirmation(true);
  };

  const setAnswer = (key: string, val: AnswerValue) => {
    setAnswers((prev) => ({ ...prev, [key]: val }));
    setShowAffirmation(false);
    setTimeout(() => triggerAffirmation(key), 80);
  };

  const slideToNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -30, duration: 150, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 30, duration: 0, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, tension: 120, friction: 10, useNativeDriver: true }),
    ]).start();
  };

  const isEditing = Object.keys(answers).length > 0 && !initialising;

  const advance = async () => {
    if (!isLast) {
      slideToNext();
      setShowAffirmation(false);
      setStep((s) => s + 1);
      return;
    }
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_answers: answers })
      .eq('id', session!.user.id);
    setLoading(false);
    if (error) { Alert.alert('Error', error.message); return; }
    router.replace('/(tabs)/home');
  };

  // ── Render options for current question ───────────────────────────────────

  const renderOptions = () => {
    if (q.type === 'scale') {
      return (
        <ScaleSelector
          min={q.min}
          max={q.max}
          value={currentAnswer as number | undefined}
          labels={(q as { scaleLabels?: { [k: number]: string } }).scaleLabels}
          onChange={(n) => setAnswer(q.key, n)}
        />
      );
    }

    if (!('options' in q)) return null;

    if (q.type === 'multi') {
      return (
        <View style={styles.chipsWrap}>
          {q.options.map((opt) => {
            const selected = Array.isArray(currentAnswer) && currentAnswer.includes(opt.value);
            return (
              <Chip
                key={opt.value}
                label={opt.label}
                selected={selected}
                onPress={() => {
                  const prev = Array.isArray(currentAnswer) ? currentAnswer : [];
                  const next = selected ? prev.filter((v) => v !== opt.value) : [...prev, opt.value];
                  setAnswer(q.key, next);
                }}
              />
            );
          })}
        </View>
      );
    }

    // choice — 2-col tiles
    return (
      <View style={styles.tilesGrid}>
        {q.options.map((opt) => {
          const selected = currentAnswer === opt.value;
          const color = 'color' in opt ? (opt as { color: string }).color : colors.primary;
          const emoji = 'emoji' in opt ? (opt as { emoji: string }).emoji : undefined;
          return (
            <ChoiceTile
              key={opt.value}
              label={opt.label}
              emoji={emoji}
              color={color}
              selected={selected}
              onPress={() => setAnswer(q.key, opt.value)}
            />
          );
        })}
      </View>
    );
  };

  if (initialising) {
    return (
      <View style={[styles.screen, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const lastBtnLabel = isEditing ? '✓ Save changes' : '🎉 Let\'s go!';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <ProgressDots total={QUESTIONS.length} current={step} />
        <View style={styles.headerRow}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => { setStep((s) => s - 1); setShowAffirmation(false); }}>
              <Text style={styles.backBtn}>← Back</Text>
            </TouchableOpacity>
          ) : <View />}
          <Text style={styles.stepLabel}>{step + 1} of {QUESTIONS.length}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {/* Question card */}
          <View style={styles.card}>
            <Text style={styles.subtitle}>{q.subtitle}</Text>
            <Text style={styles.prompt}>{q.prompt}</Text>
            {renderOptions()}
            <Affirmation text={affirmationText} visible={showAffirmation && hasAnswer} />
          </View>
        </Animated.View>
      </ScrollView>

      {/* CTA */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.btn, !hasAnswer && styles.btnDisabled]}
          onPress={advance}
          disabled={loading || !hasAnswer}
          activeOpacity={0.85}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>{isLast ? lastBtnLabel : 'Next →'}</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const TILE_GAP = spacing[3];

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[12],
    paddingBottom: spacing[4],
    alignItems: 'center',
    gap: spacing[3],
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.stroke,
  },
  dotDone: {
    backgroundColor: colors.mint,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dotActive: {
    backgroundColor: colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  backBtn: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodyMedium,
    color: colors.textSecondary,
  },
  stepLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodyMedium,
    color: colors.textMuted,
    letterSpacing: typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  scroll: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[4],
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius['2xl'],
    padding: spacing[6],
    ...shadows.medium,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodyMedium,
    color: colors.textMuted,
    marginBottom: spacing[2],
    letterSpacing: typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  prompt: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.families.display,
    color: colors.text,
    marginBottom: spacing[6],
    lineHeight: typography.sizes.xl * typography.lineHeights.snug,
  },
  // 2-col tiles
  tilesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: TILE_GAP,
    marginBottom: spacing[4],
  },
  tileWrapper: {
    width: '47.5%',
  },
  tile: {
    borderRadius: radius.lg,
    padding: spacing[4],
    alignItems: 'center',
    gap: spacing[2],
    borderWidth: 2,
    borderColor: colors.stroke,
    minHeight: 90,
    justifyContent: 'center',
  },
  tileEmoji: {
    fontSize: 28,
  },
  tileLabel: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodySemiBold,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  tileLabelSelected: {
    color: '#fff',
  },
  // chips
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  chip: {
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.stroke,
    backgroundColor: colors.surface2,
  },
  chipSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  chipText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyMedium,
    color: colors.textSecondary,
  },
  chipTextSelected: {
    color: '#fff',
    fontFamily: typography.families.bodySemiBold,
  },
  // scale
  scaleRow: {
    flexDirection: 'row',
    gap: spacing[2],
    justifyContent: 'center',
    marginBottom: spacing[3],
  },
  scaleBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.stroke,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scaleBtnSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
    ...shadows.emberGlow,
  },
  scaleBtnText: {
    fontSize: typography.sizes.md,
    fontFamily: typography.families.display,
    color: colors.textSecondary,
  },
  scaleBtnTextSelected: {
    color: '#fff',
  },
  scaleLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing[4],
    paddingHorizontal: spacing[2],
  },
  scaleLabelText: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.body,
    color: colors.textMuted,
  },
  // affirmation
  affirmation: {
    marginTop: spacing[3],
    alignSelf: 'flex-start',
    backgroundColor: colors.surface3,
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.full,
  },
  affirmationText: {
    fontSize: typography.sizes.sm,
    fontFamily: typography.families.bodyMedium,
    color: colors.primary,
  },
  // footer
  footer: {
    paddingHorizontal: spacing[5],
    paddingBottom: spacing[10],
    paddingTop: spacing[4],
    backgroundColor: colors.bg,
  },
  btn: {
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    alignItems: 'center',
    ...shadows.emberGlow,
  },
  btnDisabled: {
    opacity: 0.35,
    shadowOpacity: 0,
    elevation: 0,
  },
  btnText: {
    color: '#fff',
    fontSize: typography.sizes.md,
    fontFamily: typography.families.display,
  },
});
