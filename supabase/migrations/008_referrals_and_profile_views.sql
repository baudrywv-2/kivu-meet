-- Referrals rewards + profile views privacy

-- ============================================
-- REFERRALS
-- ============================================

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  referred_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  rewarded_at TIMESTAMPTZ,
  UNIQUE (referred_user_id),
  CHECK (referrer_id <> referred_user_id)
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_created_at ON public.referrals(created_at DESC);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Referred user can create referral" ON public.referrals;
CREATE POLICY "Referred user can create referral" ON public.referrals
  FOR INSERT
  WITH CHECK (referred_user_id = auth.uid());

DROP POLICY IF EXISTS "Referrer can view own referrals" ON public.referrals;
CREATE POLICY "Referrer can view own referrals" ON public.referrals
  FOR SELECT
  USING (referrer_id = auth.uid());

-- Reward referrer with a boost (default: +30 minutes)
CREATE OR REPLACE FUNCTION public.apply_referral_reward()
RETURNS TRIGGER AS $$
DECLARE
  reward_until TIMESTAMPTZ;
BEGIN
  IF NEW.rewarded_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  reward_until := NOW() + INTERVAL '30 minutes';

  UPDATE public.profiles
  SET profile_boosted_until = GREATEST(COALESCE(profile_boosted_until, NOW()), reward_until)
  WHERE id = NEW.referrer_id;

  UPDATE public.referrals
  SET rewarded_at = NOW()
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_apply_referral_reward ON public.referrals;
CREATE TRIGGER trigger_apply_referral_reward
  AFTER INSERT ON public.referrals
  FOR EACH ROW
  EXECUTE FUNCTION public.apply_referral_reward();

-- ============================================
-- PROFILE VIEWS (privacy-focused)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profile_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  viewer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  viewed_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (viewer_id <> viewed_id)
);

CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_created ON public.profile_views(viewed_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_created ON public.profile_views(viewer_id, created_at DESC);

ALTER TABLE public.profile_views ENABLE ROW LEVEL SECURITY;

-- Viewer can write the view event.
DROP POLICY IF EXISTS "Users can insert own profile view events" ON public.profile_views;
CREATE POLICY "Users can insert own profile view events" ON public.profile_views
  FOR INSERT
  WITH CHECK (viewer_id = auth.uid());

-- Stricter privacy: only the viewed user can read their view events (used for counting).
DROP POLICY IF EXISTS "Users can read views of their profile" ON public.profile_views;
CREATE POLICY "Users can read views of their profile" ON public.profile_views
  FOR SELECT
  USING (viewed_id = auth.uid());

