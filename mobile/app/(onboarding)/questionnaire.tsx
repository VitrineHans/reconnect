import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius } from '../../theme/tokens';

const QUESTIONS = [
  { key: 'friendship_length', prompt: 'How long have you known each other?', type: 'choice' as const,
    options: [{ label: 'Just met', value: 'just_met' }, { label: 'Under a year', value: '<1yr' }, { label: '1–3 years', value: '1-3yr' }, { label: '3+ years', value: '3+' }] },
  { key: 'conversation_style', prompt: 'What do you usually talk about?', type: 'multi' as const,
    options: [{ label: 'Everyday stuff', value: 'everyday' }, { label: 'Deep life stuff', value: 'deep' }, { label: 'Jokes & banter', value: 'jokes' }, { label: 'Shared hobbies', value: 'hobbies' }] },
  { key: 'personality', prompt: 'Pick your vibe', type: 'choice' as const,
    options: [{ label: 'Laid-back', value: 'laid-back' }, { label: 'Adventurous', value: 'adventurous' }, { label: 'Thoughtful', value: 'thoughtful' }, { label: 'Spontaneous', value: 'spontaneous' }] },
  { key: 'life_focus', prompt: 'What matters most to you right now?', type: 'choice' as const,
    options: [{ label: 'Career', value: 'career' }, { label: 'Relationships', value: 'relationships' }, { label: 'Health', value: 'health' }, { label: 'Creativity', value: 'creativity' }] },
  { key: 'depth_comfort', prompt: 'How comfortable are you with deep questions?', type: 'scale' as const, min: 1, max: 5 },
  { key: 'off_limits', prompt: 'Any topics that are off-limits?', type: 'multi' as const,
    options: [{ label: 'Family', value: 'family' }, { label: 'Work', value: 'work' }, { label: 'Money', value: 'money' }, { label: 'Relationships', value: 'relationships' }, { label: 'Health', value: 'health' }] },
] as const;

type AnswerValue = string | string[] | number;

function ChoiceButton({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity
      style={[styles.option, selected && styles.optionSelected]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.optionTextSelected]}>{label}</Text>
    </TouchableOpacity>
  );
}

function renderQuestion(
  q: (typeof QUESTIONS)[number],
  answers: Record<string, AnswerValue>,
  setAnswer: (key: string, val: AnswerValue) => void,
) {
  if (q.type === 'scale') {
    const val = (answers[q.key] as number) ?? q.min;
    return (
      <View style={styles.scaleRow}>
        {Array.from({ length: q.max - q.min + 1 }, (_, i) => i + q.min).map((n) => (
          <ChoiceButton key={n} label={String(n)} selected={val === n} onPress={() => setAnswer(q.key, n)} />
        ))}
      </View>
    );
  }
  if (!('options' in q)) return null;
  return (
    <View style={styles.optionsGrid}>
      {q.options.map((opt) => {
        const cur = answers[q.key];
        const selected = q.type === 'multi'
          ? Array.isArray(cur) && cur.includes(opt.value)
          : cur === opt.value;
        const onPress = () => {
          if (q.type === 'multi') {
            const prev = Array.isArray(cur) ? cur : [];
            setAnswer(q.key, prev.includes(opt.value) ? prev.filter((v) => v !== opt.value) : [...prev, opt.value]);
          } else {
            setAnswer(q.key, opt.value);
          }
        };
        return <ChoiceButton key={opt.value} label={opt.label} selected={selected} onPress={onPress} />;
      })}
    </View>
  );
}

export default function QuestionnaireScreen() {
  const { session } = useSession();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(false);

  const setAnswer = (key: string, val: AnswerValue) => setAnswers((prev) => ({ ...prev, [key]: val }));
  const q = QUESTIONS[step];
  const progress = (step / QUESTIONS.length) * 100;
  const isLast = step === QUESTIONS.length - 1;

  const advance = async () => {
    if (!isLast) { setStep((s) => s + 1); return; }
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ onboarding_answers: answers })
      .eq('id', session!.user.id);
    setLoading(false);
    if (error) Alert.alert('Error', error.message);
    // Auth guard detects onboarding_answers set → redirects to home
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progress}%` }]} />
      </View>
      <Text style={styles.stepLabel}>{step + 1} of {QUESTIONS.length}</Text>
      <Text style={styles.prompt}>{q.prompt}</Text>
      {renderQuestion(q, answers, setAnswer)}
      <TouchableOpacity style={styles.button} onPress={advance} disabled={loading}>
        {loading
          ? <ActivityIndicator color={colors.bg} />
          : <Text style={styles.buttonText}>{isLast ? 'Submit' : 'Next'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing[6],
    flexGrow: 1,
    backgroundColor: colors.bg,
  },
  progressBar: {
    height: 3,
    backgroundColor: colors.surface3,
    borderRadius: radius.full,
    marginBottom: spacing[6],
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
    backgroundColor: colors.ember,
    borderRadius: radius.full,
  },
  stepLabel: {
    fontSize: typography.sizes.xs,
    fontFamily: typography.families.bodyMedium,
    color: colors.textMuted,
    marginBottom: spacing[3],
    letterSpacing: typography.letterSpacing.widest,
    textTransform: 'uppercase',
  },
  prompt: {
    fontSize: typography.sizes.xl,
    fontFamily: typography.families.display,
    color: colors.text,
    letterSpacing: typography.letterSpacing.tight,
    marginBottom: spacing[6],
    lineHeight: typography.sizes.xl * typography.lineHeights.snug,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[8],
  },
  scaleRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[8],
  },
  option: {
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.stroke,
    backgroundColor: colors.surface2,
  },
  optionSelected: {
    borderColor: colors.ember,
    backgroundColor: colors.ember,
  },
  optionText: {
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodyMedium,
    color: colors.textSecondary,
  },
  optionTextSelected: {
    color: colors.bg,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '600',
  },
  button: {
    backgroundColor: colors.ember,
    borderRadius: radius.md,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: 'auto',
  },
  buttonText: {
    color: colors.bg,
    fontSize: typography.sizes.base,
    fontFamily: typography.families.bodySemiBold,
    fontWeight: '600',
  },
});
