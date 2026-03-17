INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-intros', 'voice-intros', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Users can upload own voice intro" ON storage.objects;
CREATE POLICY "Users can upload own voice intro"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-intros' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own voice intro" ON storage.objects;
CREATE POLICY "Users can update own voice intro"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'voice-intros' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Voice intros are publicly readable" ON storage.objects;
CREATE POLICY "Voice intros are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'voice-intros');
