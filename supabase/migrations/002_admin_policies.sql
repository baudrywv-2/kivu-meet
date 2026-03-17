-- Admin and moderator policies
-- Users with role 'admin' or 'moderator' can access admin functions

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'moderator')
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Admins can read all profiles
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
CREATE POLICY "Admins can read all profiles" ON public.profiles
  FOR SELECT USING (is_admin());

-- Admins can delete profiles (for moderation)
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;
CREATE POLICY "Admins can delete profiles" ON public.profiles
  FOR DELETE USING (is_admin());

-- Admins can read and update reports
DROP POLICY IF EXISTS "Admins can read all reports" ON public.reports;
CREATE POLICY "Admins can read all reports" ON public.reports
  FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "Admins can update reports" ON public.reports;
CREATE POLICY "Admins can update reports" ON public.reports
  FOR UPDATE USING (is_admin());

-- Admins can update confessions (e.g. set is_removed)
DROP POLICY IF EXISTS "Admins can update confessions" ON public.confessions;
CREATE POLICY "Admins can update confessions" ON public.confessions
  FOR UPDATE USING (is_admin());
