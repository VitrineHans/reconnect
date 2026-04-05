import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface Question {
  id: string;
  text: string;
  category: 'funny' | 'deep' | 'personal';
}

export interface UseQuestionResult {
  question: Question | null;
  loading: boolean;
  error: string | null;
  rateQuestion: (questionId: string, rating: 1 | -1) => Promise<void>;
}

async function fetchCurrentQuestion(friendshipId: string): Promise<Question | null> {
  const { data, error } = await supabase
    .from('friendships')
    .select('current_question_id, questions!current_question_id(id, text, category)')
    .eq('id', friendshipId)
    .single();

  if (error) throw new Error(error.message);
  if (!data?.current_question_id) return null;

  const q = (data.questions as unknown) as { id: string; text: string; category: string } | null;
  if (!q) return null;

  return {
    id: q.id,
    text: q.text,
    category: q.category as Question['category'],
  };
}

async function upsertRating(questionId: string, rating: 1 | -1): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('question_ratings')
    .upsert({ user_id: user.id, question_id: questionId, rating }, { onConflict: 'user_id,question_id' });

  if (error) throw new Error(error.message);
}

export function useQuestion(friendshipId: string | null): UseQuestionResult {
  const [question, setQuestion] = useState<Question | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!friendshipId) {
      setQuestion(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetchCurrentQuestion(friendshipId)
      .then(setQuestion)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [friendshipId]);

  const rateQuestion = async (questionId: string, rating: 1 | -1): Promise<void> => {
    try {
      await upsertRating(questionId, rating);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Rating failed';
      setError(msg);
    }
  };

  return { question, loading, error, rateQuestion };
}
