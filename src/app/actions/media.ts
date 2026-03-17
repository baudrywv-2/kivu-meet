'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { parseStorageRef } from '@/lib/storageRef';
import { redirect } from 'next/navigation';

type SignedUrlResult = { url?: string; error?: string };

const DEFAULT_EXPIRES_IN = 60 * 60; // 1 hour

export async function getSignedUrlForRef(
  ref: string,
  opts?: { matchId?: string; expiresIn?: number }
): Promise<SignedUrlResult> {
  const parsed = parseStorageRef(ref);
  if (!parsed) return { error: 'Invalid media ref' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { bucket, path } = parsed;

  // Authorization checks (do not leak verification media)
  if (bucket === 'verification') {
    const owner = path.split('/')[0];
    if (owner !== user.id) return { error: 'Forbidden' };
  }

  if (bucket === 'chat-media') {
    const matchId = opts?.matchId;
    if (!matchId) return { error: 'Missing matchId' };
    const { data: match, error } = await supabase
      .from('matches')
      .select('user_a_id, user_b_id')
      .eq('id', matchId)
      .single();
    if (error || !match) return { error: 'Forbidden' };
    if (match.user_a_id !== user.id && match.user_b_id !== user.id) return { error: 'Forbidden' };
  }

  // For voice intros we allow any authenticated user (profiles are visible in-app).
  // For chat-media authorization is above. For verification we restrict to owner above.
  const admin = createAdminClient();
  const expiresIn = opts?.expiresIn ?? DEFAULT_EXPIRES_IN;
  const { data, error } = await admin.storage.from(bucket).createSignedUrl(path, expiresIn);
  if (error) return { error: error.message };
  return { url: data?.signedUrl };
}

