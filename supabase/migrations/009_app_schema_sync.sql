-- App schema sync for features used in code

-- ============================================
-- PROFILES: add missing columns referenced in app
-- ============================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS boost_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_selfie_url TEXT,
  ADD COLUMN IF NOT EXISTS verification_status TEXT,
  ADD COLUMN IF NOT EXISTS push_match_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS push_message_enabled BOOLEAN NOT NULL DEFAULT true;

-- ============================================
-- MESSAGES: add missing columns referenced in app
-- ============================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS client_message_id TEXT,
  ADD COLUMN IF NOT EXISTS reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_client_message_id ON public.messages(client_message_id) WHERE client_message_id IS NOT NULL;

-- ============================================
-- DAILY USAGE: rewinds limiter
-- ============================================

CREATE TABLE IF NOT EXISTS public.daily_usage (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  rewinds_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, day)
);

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own daily usage" ON public.daily_usage;
CREATE POLICY "Users can manage own daily usage" ON public.daily_usage
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_daily_usage_touch_updated_at ON public.daily_usage;
CREATE TRIGGER trigger_daily_usage_touch_updated_at
  BEFORE UPDATE ON public.daily_usage
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

-- ============================================
-- VERIFICATION REQUESTS (admin review queue)
-- ============================================

CREATE TABLE IF NOT EXISTS public.verification_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  selfie_ref TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_requests_status_created ON public.verification_requests(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_requests_user ON public.verification_requests(user_id);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

-- Users can create their own request rows
DROP POLICY IF EXISTS "Users can create own verification requests" ON public.verification_requests;
CREATE POLICY "Users can create own verification requests" ON public.verification_requests
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Admins can read/update
DROP POLICY IF EXISTS "Admins can read verification requests" ON public.verification_requests;
CREATE POLICY "Admins can read verification requests" ON public.verification_requests
  FOR SELECT
  USING (is_admin());

DROP POLICY IF EXISTS "Admins can update verification requests" ON public.verification_requests;
CREATE POLICY "Admins can update verification requests" ON public.verification_requests
  FOR UPDATE
  USING (is_admin());

-- ============================================
-- VERIFICATION STORAGE BUCKET
-- ============================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('verification', 'verification', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Users can upload their own verification selfies
DROP POLICY IF EXISTS "Users can upload own verification selfie" ON storage.objects;
CREATE POLICY "Users can upload own verification selfie"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own verification selfie" ON storage.objects;
CREATE POLICY "Users can update own verification selfie"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Admin can read verification objects via service role / admin tooling; no public read policy.

-- ============================================
-- MESSAGE RECEIPTS / REACTIONS / HIDDEN
-- ============================================

CREATE TABLE IF NOT EXISTS public.message_receipts (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_receipts_user ON public.message_receipts(user_id, updated_at DESC);

ALTER TABLE public.message_receipts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can upsert own message receipts" ON public.message_receipts;
CREATE POLICY "Users can upsert own message receipts" ON public.message_receipts
  FOR ALL
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

DROP TRIGGER IF EXISTS trigger_message_receipts_touch_updated_at ON public.message_receipts;
CREATE TRIGGER trigger_message_receipts_touch_updated_at
  BEFORE UPDATE ON public.message_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_message_reactions_user ON public.message_reactions(user_id, created_at DESC);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage reactions within own matches" ON public.message_reactions;
CREATE POLICY "Users can manage reactions within own matches" ON public.message_reactions
  FOR ALL
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

CREATE TABLE IF NOT EXISTS public.message_hidden (
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_message_hidden_user ON public.message_hidden(user_id, created_at DESC);

ALTER TABLE public.message_hidden ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage own hidden messages" ON public.message_hidden;
CREATE POLICY "Users can manage own hidden messages" ON public.message_hidden
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

