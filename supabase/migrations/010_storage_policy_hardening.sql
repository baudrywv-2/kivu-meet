-- Harden storage policies (reduce anonymous access)

-- Buckets should already exist; ensure expected visibility
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('avatars', 'avatars', true),
  ('voice-intros', 'voice-intros', true),
  ('chat-media', 'chat-media', false),
  ('verification', 'verification', false)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- Remove overly-broad generic policies (these are unsafe if applied to role "public")
DROP POLICY IF EXISTS "Storage insert own files" ON storage.objects;
DROP POLICY IF EXISTS "Storage read own files" ON storage.objects;
DROP POLICY IF EXISTS "Storage update own files" ON storage.objects;
DROP POLICY IF EXISTS "Storage delete own files" ON storage.objects;

-- Remove duplicate/legacy public-read avatar policy if present
DROP POLICY IF EXISTS "Public read avatars" ON storage.objects;

-- Avatars: public read, authenticated write in own folder
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own avatar" ON storage.objects;
CREATE POLICY "Users can update own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Avatars are publicly readable" ON storage.objects;
CREATE POLICY "Avatars are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Voice intros: public read, authenticated write in own folder
DROP POLICY IF EXISTS "Users can upload own voice intro" ON storage.objects;
CREATE POLICY "Users can upload own voice intro"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'voice-intros' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own voice intro" ON storage.objects;
CREATE POLICY "Users can update own voice intro"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'voice-intros' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Voice intros are publicly readable" ON storage.objects;
CREATE POLICY "Voice intros are publicly readable"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'voice-intros');

-- Chat media: private; authenticated users can manage only their own folder.
DROP POLICY IF EXISTS "chat-media insert own" ON storage.objects;
CREATE POLICY "chat-media insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat-media update own" ON storage.objects;
CREATE POLICY "chat-media update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat-media delete own" ON storage.objects;
CREATE POLICY "chat-media delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "chat-media select own" ON storage.objects;
CREATE POLICY "chat-media select own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat-media' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Verification: private; authenticated users can manage only their own folder.
DROP POLICY IF EXISTS "verification insert own" ON storage.objects;
CREATE POLICY "verification insert own"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verification update own" ON storage.objects;
CREATE POLICY "verification update own"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verification delete own" ON storage.objects;
CREATE POLICY "verification delete own"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "verification select own" ON storage.objects;
CREATE POLICY "verification select own"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'verification' AND (storage.foldername(name))[1] = auth.uid()::text);

