import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, StyleSheet, Alert } from 'react-native';
import { useSession } from '../../hooks/useSession';
import { supabase } from '../../lib/supabase';

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
  const progress = ((step) / QUESTIONS.length) * 100;
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
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isLast ? 'Submit' : 'Next'}</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: 24, flexGrow: 1, backgroundColor: '#fff' },
  progressBar: { height: 4, backgroundColor: '#eee', borderRadius: 2, marginBottom: 24 },
  progressFill: { height: 4, backgroundColor: '#000', borderRadius: 2 },
  stepLabel: { fontSize: 13, color: '#999', marginBottom: 8 },
  prompt: { fontSize: 22, fontWeight: '700', marginBottom: 24, color: '#111' },
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 32 },
  scaleRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  option: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 8, borderWidth: 1.5, borderColor: '#ddd', backgroundColor: '#fff' },
  optionSelected: { borderColor: '#000', backgroundColor: '#000' },
  optionText: { fontSize: 15, color: '#333' },
  optionTextSelected: { color: '#fff', fontWeight: '600' },
  button: { backgroundColor: '#000', borderRadius: 8, padding: 16, alignItems: 'center', marginTop: 'auto' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
