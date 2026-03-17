'use server';

import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import { toStorageRef } from '@/lib/storageRef';

const BUCKET = 'verification';

export async function uploadVerificationSelfie(formData: FormData): Promise<{ ref?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const locale: 'en' | 'fr' | 'sw' | 'ln' = (user.user_metadata?.locale ?? 'en') as any;

  const file = formData.get('file') as File;
  if (!file?.size) return { error: t(locale, 'verificationNoFile') };

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  if (!['jpg', 'jpeg', 'png', 'webp'].includes(ext)) {
    return { error: t(locale, 'verificationSelfieHint') };
  }
  if (file.size > 5 * 1024 * 1024) return { error: t(locale, 'verificationSelfieHint') };

  const path = `${user.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      verification_status: 'pending',
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (updateError) return { error: updateError.message };

  // Create/replace verification request row
  try {
    await supabase.from('verification_requests').insert({
      user_id: user.id,
      selfie_ref: toStorageRef(BUCKET, path),
      status: 'pending',
    });
  } catch {
    // optional table
  }

  return { ref: toStorageRef(BUCKET, path) };
}

/** Admin or cron: set a user as verified (e.g. after manual review). */
export async function approveVerification(userId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Unauthorized' };
  // In production, restrict to admin role
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin' && user.id !== userId) {
    return { error: 'Forbidden' };
  }

  const { error } = await supabase
    .from('profiles')
    .update({ is_verified: true, verification_status: 'approved', updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) return { error: error.message };
  return {};
}
