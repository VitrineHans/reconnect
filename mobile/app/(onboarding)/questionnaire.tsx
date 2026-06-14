import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius, shadows } from '../../theme/tokens';

// ── Questions (fun → personal → deeper) ──────────────────────────────────────
// Structure only — all display text lives in locales/<lang>.json under
// `questionnaire.<key>` (prompt, subtitle, options.<value>, affirmations).

const QUESTIONS = [
  {
    key: 'personality',
    type: 'choice' as const,
    options: [
      { value: 'funny',     emoji: '😄', color: colors.yellow },
      { value: 'thinker',   emoji: '🤔', color: colors.sky },
      { value: 'energiser', emoji: '⚡', color: colors.primary },
      { value: 'calm',      emoji: '🌿', color: colors.mint },
    ],
  },
  {
    key: 'interests',
    type: 'multi' as const,
    options: [
      { value: 'music' },
      { value: 'sport' },
      { value: 'travel' },
      { value: 'food' },
      { value: 'gaming' },
      { value: 'reading' },
      { value: 'creative' },
      { value: 'film' },
      { value: 'wellness' },
      { value: 'animals' },
    ],
  },
  {
    key: 'age_range',
    type: 'choice' as const,
    options: [
      { value: 'u18',   emoji: '🌱', color: colors.mint },
      { value: '18-24', emoji: '🎓', color: colors.yellow },
      { value: '25-34', emoji: '💼', color: colors.primary },
      { value: '35-44', emoji: '🌟', color: colors.sky },
      { value: '45+',   emoji: '👑', color: colors.lilac },
    ],
  },
  {
    key: 'country',
    type: 'choice' as const,
    options: [
      { value: 'nl', emoji: '🇳🇱', color: colors.sky },
      { value: 'be', emoji: '🇧🇪', color: colors.yellow },
      { value: 'de', emoji: '🇩🇪', color: colors.primary },
      { value: 'uk', emoji: '🇬🇧', color: colors.mint },
      { value: 'us', emoji: '🇺🇸', color: colors.sky },
      { value: 'other', emoji: '🌐', color: colors.lilac },
    ],
  },
  {
    key: 'life_stage',
    type: 'choice' as const,
    options: [
      { value: 'studying',  emoji: '🎓', color: colors.yellow },
      { value: 'working',   emoji: '💼', color: colors.primary },
      { value: 'parent',    emoji: '👶', color: colors.mint },
      { value: 'exploring', emoji: '🌱', color: colors.sky },
    ],
  },
  {
    key: 'depth_comfort',
    type: 'scale' as const,
    min: 1,
    max: 5,
  },
  {
    key: 'off_limits',
    type: 'multi' as const,
    options: [
      { value: 'family' },
      { value: 'money' },
      { value: 'relationships' },
      { value: 'health' },
      { value: 'none' },
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
  const { t } = useTranslation();
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
    const texts = t(`questionnaire.${key}.affirmations`, { returnObjects: true }) as unknown as string[];
    if (!Array.isArray(texts) || texts.length === 0) return;
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
    if (error) { Alert.alert(t('common.error'), error.message); return; }
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
          labels={{ [q.min]: t(`questionnaire.${q.key}.scaleMin`), [q.max]: t(`questionnaire.${q.key}.scaleMax`) }}
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
                label={t(`questionnaire.${q.key}.options.${opt.value}`)}
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
              label={t(`questionnaire.${q.key}.options.${opt.value}`)}
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

  const lastBtnLabel = isEditing ? t('questionnaire.saveChanges') : t('questionnaire.letsGo');

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <ProgressDots total={QUESTIONS.length} current={step} />
        <View style={styles.headerRow}>
          {step > 0 ? (
            <TouchableOpacity onPress={() => { setStep((s) => s - 1); setShowAffirmation(false); }}>
              <Text style={styles.backBtn}>{t('questionnaire.back')}</Text>
            </TouchableOpacity>
          ) : <View />}
          <Text style={styles.stepLabel}>{t('questionnaire.stepLabel', { current: step + 1, total: QUESTIONS.length })}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ transform: [{ translateX: slideAnim }] }}>
          {/* Question card */}
          <View style={styles.card}>
            <Text style={styles.subtitle}>{t(`questionnaire.${q.key}.subtitle`)}</Text>
            <Text style={styles.prompt}>{t(`questionnaire.${q.key}.prompt`)}</Text>
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
            : <Text style={styles.btnText}>{isLast ? lastBtnLabel : t('questionnaire.next')}</Text>}
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
