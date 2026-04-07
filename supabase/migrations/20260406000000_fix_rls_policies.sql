-- Fix RLS policies for question_responses
-- Drop all existing policies and recreate with correct WITH CHECK clauses

DROP POLICY IF EXISTS "Only friendship members can access responses" ON public.question_responses;
DROP POLICY IF EXISTS "question_responses_insert_own" ON public.question_responses;
DROP POLICY IF EXISTS "question_responses_delete_own_friendship" ON public.question_responses;
DROP POLICY IF EXISTS "qr_select" ON public.question_responses;
DROP POLICY IF EXISTS "qr_insert" ON public.question_responses;
DROP POLICY IF EXISTS "qr_delete" ON public.question_responses;

CREATE POLICY "qr_select" ON public.question_responses
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE id = question_responses.friendship_id
      AND (user_a = auth.uid() OR user_b = auth.uid())
    )
  );

CREATE POLICY "qr_insert" ON public.question_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.friendships
      WHERE id = question_responses.friendship_id
      AND (user_a = auth.uid() OR user_b = auth.uid())
    )
  );

CREATE POLICY "qr_delete" ON public.question_responses
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.friendships
      WHERE id = question_responses.friendship_id
      AND (user_a = auth.uid() OR user_b = auth.uid())
    )
  );

-- Fix friendships UPDATE policy (needed for streak increment + question rotation)
DROP POLICY IF EXISTS "friendships_update_members" ON public.friendships;

CREATE POLICY "friendships_update_members" ON public.friendships
  FOR UPDATE TO authenticated
  USING (user_a = auth.uid() OR user_b = auth.uid())
  WITH CHECK (user_a = auth.uid() OR user_b = auth.uid());
