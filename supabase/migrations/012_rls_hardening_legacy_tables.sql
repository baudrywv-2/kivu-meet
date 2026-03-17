-- Harden legacy tables that exist remotely (make them authenticated-only)

-- blocks
ALTER TABLE public.blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocks FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Blocker blocks - select" ON public.blocks;
DROP POLICY IF EXISTS "Blocker blocks - insert" ON public.blocks;
DROP POLICY IF EXISTS "Blocker blocks - delete" ON public.blocks;

CREATE POLICY "Users can manage own blocks (legacy)"
ON public.blocks
FOR ALL
TO authenticated
USING (blocker_id = auth.uid())
WITH CHECK (blocker_id = auth.uid());

-- swipes
ALTER TABLE public.swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.swipes FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Swiper can select own swipes" ON public.swipes;
DROP POLICY IF EXISTS "Swiper can insert own swipes" ON public.swipes;

CREATE POLICY "Users can manage own swipes (legacy)"
ON public.swipes
FOR ALL
TO authenticated
USING (swiper_id = auth.uid())
WITH CHECK (swiper_id = auth.uid());

-- typing_status
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.typing_status FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User typing status - select" ON public.typing_status;
DROP POLICY IF EXISTS "User typing status - insert" ON public.typing_status;
DROP POLICY IF EXISTS "User typing status - update" ON public.typing_status;
DROP POLICY IF EXISTS "User typing status - delete" ON public.typing_status;

-- Allow user to manage their own typing flag, but only for matches they're in
CREATE POLICY "Users can manage typing status for own matches (legacy)"
ON public.typing_status
FOR ALL
TO authenticated
USING (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
  )
)
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (
    SELECT 1
    FROM public.matches m
    WHERE m.id = match_id
      AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
  )
);

-- user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "User prefs - select" ON public.user_preferences;
DROP POLICY IF EXISTS "User prefs - insert" ON public.user_preferences;
DROP POLICY IF EXISTS "User prefs - update" ON public.user_preferences;

CREATE POLICY "Users can manage own preferences (legacy)"
ON public.user_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

