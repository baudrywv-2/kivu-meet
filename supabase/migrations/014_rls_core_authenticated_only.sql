-- Core RLS hardening: remove PUBLIC-granted policies and recreate as authenticated-only

DO $$
DECLARE
  r record;
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'profiles',
    'likes',
    'matches',
    'messages',
    'blocked_users',
    'reports',
    'confessions',
    'confession_likes',
    'confession_comments',
    'push_subscriptions',
    'referrals',
    'profile_views',
    'verification_requests',
    'daily_usage',
    'message_receipts',
    'message_reactions',
    'message_hidden'
  ]
  LOOP
    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public' AND tablename = t
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, t);
    END LOOP;
  END LOOP;
END $$;

-- Force RLS for user-facing tables
ALTER TABLE public.profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE public.likes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.matches FORCE ROW LEVEL SECURITY;
ALTER TABLE public.messages FORCE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users FORCE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;
ALTER TABLE public.confessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.confession_likes FORCE ROW LEVEL SECURITY;
ALTER TABLE public.confession_comments FORCE ROW LEVEL SECURITY;
ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.referrals FORCE ROW LEVEL SECURITY;
ALTER TABLE public.profile_views FORCE ROW LEVEL SECURITY;
ALTER TABLE public.verification_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage FORCE ROW LEVEL SECURITY;
ALTER TABLE public.message_receipts FORCE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.message_hidden FORCE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Profiles are viewable by authenticated users"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_visible = true OR id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Admin policies (reuse is_admin() function from 002)
CREATE POLICY "Admins can read all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update any profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (is_admin());

-- LIKES
CREATE POLICY "Users can manage own likes"
ON public.likes
FOR ALL
TO authenticated
USING (liker_id = auth.uid())
WITH CHECK (liker_id = auth.uid());

CREATE POLICY "Users can see likes where they are liked"
ON public.likes
FOR SELECT
TO authenticated
USING (liked_id = auth.uid());

-- MATCHES
CREATE POLICY "Match participants can read"
ON public.matches
FOR SELECT
TO authenticated
USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

CREATE POLICY "Match participants can delete match"
ON public.matches
FOR DELETE
TO authenticated
USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- MESSAGES
CREATE POLICY "Match participants can manage messages"
ON public.messages
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
  )
);

-- BLOCKED USERS
CREATE POLICY "Users can manage own blocks"
ON public.blocked_users
FOR ALL
TO authenticated
USING (blocker_id = auth.uid())
WITH CHECK (blocker_id = auth.uid());

-- REPORTS
CREATE POLICY "Users can create reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can view own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

CREATE POLICY "Admins can read all reports"
ON public.reports
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update reports"
ON public.reports
FOR UPDATE
TO authenticated
USING (is_admin());

-- CONFESSIONS
CREATE POLICY "Confessions are viewable by authenticated users"
ON public.confessions
FOR SELECT
TO authenticated
USING (is_removed = false);

CREATE POLICY "Authenticated users can post confessions"
ON public.confessions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update confessions"
ON public.confessions
FOR UPDATE
TO authenticated
USING (is_admin());

-- CONFESSION LIKES/COMMENTS
CREATE POLICY "Users can manage confession likes"
ON public.confession_likes
FOR ALL
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Users can manage confession comments"
ON public.confession_comments
FOR ALL
TO authenticated
USING (user_id = auth.uid() OR user_id IS NULL)
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- PUSH SUBSCRIPTIONS
CREATE POLICY "Users can manage own push subscriptions"
ON public.push_subscriptions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- REFERRALS
CREATE POLICY "Referred user can create referral"
ON public.referrals
FOR INSERT
TO authenticated
WITH CHECK (referred_user_id = auth.uid());

CREATE POLICY "Referrer can view own referrals"
ON public.referrals
FOR SELECT
TO authenticated
USING (referrer_id = auth.uid());

-- PROFILE VIEWS
CREATE POLICY "Users can insert own profile view events"
ON public.profile_views
FOR INSERT
TO authenticated
WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "Users can read views of their profile"
ON public.profile_views
FOR SELECT
TO authenticated
USING (viewed_id = auth.uid());

-- DAILY USAGE
CREATE POLICY "Users can manage own daily usage"
ON public.daily_usage
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- VERIFICATION REQUESTS
CREATE POLICY "Users can create own verification requests"
ON public.verification_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can read verification requests"
ON public.verification_requests
FOR SELECT
TO authenticated
USING (is_admin());

CREATE POLICY "Admins can update verification requests"
ON public.verification_requests
FOR UPDATE
TO authenticated
USING (is_admin());

-- MESSAGE RECEIPTS / REACTIONS / HIDDEN
CREATE POLICY "Users can upsert own message receipts"
ON public.message_receipts
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.messages msg
    JOIN public.matches m ON m.id = msg.match_id
    WHERE msg.id = message_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.messages msg
    JOIN public.matches m ON m.id = msg.match_id
    WHERE msg.id = message_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
  )
);

CREATE POLICY "Users can manage reactions within own matches"
ON public.message_reactions
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.messages msg
    JOIN public.matches m ON m.id = msg.match_id
    WHERE msg.id = message_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.messages msg
    JOIN public.matches m ON m.id = msg.match_id
    WHERE msg.id = message_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
  )
);

CREATE POLICY "Users can manage own hidden messages"
ON public.message_hidden
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

