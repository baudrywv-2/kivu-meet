-- Cleanup legacy storage policies that grant anon access

-- Voice intros: remove legacy policies that were attached to role "public"
DROP POLICY IF EXISTS "voice-intros insert own" ON storage.objects;
DROP POLICY IF EXISTS "voice-intros update own" ON storage.objects;
DROP POLICY IF EXISTS "voice-intros delete own" ON storage.objects;
DROP POLICY IF EXISTS "voice-intros select own" ON storage.objects;

-- Provide an explicit delete policy for authenticated users (optional but consistent)
DROP POLICY IF EXISTS "Users can delete own voice intro" ON storage.objects;
CREATE POLICY "Users can delete own voice intro"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'voice-intros' AND (storage.foldername(name))[1] = auth.uid()::text);

