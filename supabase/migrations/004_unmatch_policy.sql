-- Allow match participants to delete (unmatch)
DROP POLICY IF EXISTS "Match participants can delete match" ON public.matches;
CREATE POLICY "Match participants can delete match" ON public.matches
  FOR DELETE USING (user_a_id = auth.uid() OR user_b_id = auth.uid());
