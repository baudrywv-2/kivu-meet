-- Allow admins to update profiles (e.g. subscription_tier, profile_boosted_until)
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (is_admin());
