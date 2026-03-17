'use server';

import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import { toStorageRef } from '@/lib/storageRef';
import { checkRateLimit } from '@/lib/rateLimit';

const BUCKET = 'avatars';
const UPLOADS_PER_MINUTE = 20;
const CHAT_UPLOADS_PER_MINUTE = 30;

export async function uploadAvatar(formData: FormData): Promise<{ url?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const locale: 'en' | 'fr' | 'sw' | 'ln' = (user.user_metadata?.locale ?? 'en') as any;

  const file = formData.get('file') as File;
  if (!file?.size) return { error: t(locale, 'verificationNoFile') };

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return { error: t(locale, 'verificationSelfieHint') };
  }
  if (file.size > 5 * 1024 * 1024) return { error: t(locale, 'verificationSelfieHint') };

  const path = `${user.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const rate = await checkRateLimit(supabase, 'profiles', 'id', user.id, UPLOADS_PER_MINUTE);
  if (!rate.ok) return { error: 'Too many uploads. Try again later.' };

  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: urlData.publicUrl };
}

const VOICE_BUCKET = 'voice-intros';
const VOICE_MAX_MB = 5;

export async function uploadVoiceIntro(formData: FormData): Promise<{ ref?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const locale: 'en' | 'fr' | 'sw' | 'ln' = (user.user_metadata?.locale ?? 'en') as any;

  const file = formData.get('file') as File;
  if (!file?.size) return { error: t(locale, 'verificationNoFile') };

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
  if (!['mp3', 'm4a', 'webm', 'wav', 'ogg'].includes(ext)) {
    return { error: t(locale, 'voiceFileHint') };
  }
  if (file.size > VOICE_MAX_MB * 1024 * 1024) return { error: t(locale, 'voiceFileTooLarge') };

  const path = `${user.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const rate = await checkRateLimit(supabase, 'profiles', 'id', user.id, UPLOADS_PER_MINUTE);
  if (!rate.ok) return { error: t(locale, 'messageRateLimited') };

  const { error: uploadError } = await supabase.storage
    .from(VOICE_BUCKET)
    .upload(path, buffer, { contentType: file.type || 'audio/mpeg', upsert: true });

  if (uploadError) return { error: uploadError.message };

  return { ref: toStorageRef(VOICE_BUCKET, path) };
}

const CHAT_MEDIA_BUCKET = 'chat-media';

/** Chat voice message – stored in chat-media bucket */
export async function uploadChatVoice(formData: FormData): Promise<{ ref?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const locale: 'en' | 'fr' | 'sw' | 'ln' = (user.user_metadata?.locale ?? 'en') as any;

  const file = formData.get('file') as File;
  if (!file?.size) return { error: t(locale, 'verificationNoFile') };

  const ext = file.name.split('.').pop()?.toLowerCase() || 'mp3';
  if (!['mp3', 'm4a', 'webm', 'wav', 'ogg'].includes(ext)) {
    return { error: t(locale, 'voiceFileHint') };
  }
  if (file.size > 5 * 1024 * 1024) return { error: t(locale, 'voiceFileTooLarge') };

  const path = `${user.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const rate = await checkRateLimit(supabase, 'messages', 'sender_id', user.id, CHAT_UPLOADS_PER_MINUTE);
  if (!rate.ok) return { error: t(locale, 'messageRateLimited') };

  const { error: uploadError } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, buffer, { contentType: file.type || 'audio/mpeg', upsert: true });

  if (uploadError) return { error: uploadError.message };

  return { ref: toStorageRef(CHAT_MEDIA_BUCKET, path) };
}

/** Chat image – stored in chat-media bucket */
export async function uploadChatImage(formData: FormData): Promise<{ ref?: string; error?: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const locale: 'en' | 'fr' | 'sw' | 'ln' = (user.user_metadata?.locale ?? 'en') as any;

  const file = formData.get('file') as File;
  if (!file?.size) return { error: t(locale, 'verificationNoFile') };

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  if (!['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) {
    return { error: t(locale, 'verificationSelfieHint') };
  }
  if (file.size > 5 * 1024 * 1024) return { error: t(locale, 'verificationSelfieHint') };

  const path = `${user.id}/${Date.now()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = new Uint8Array(arrayBuffer);

  const rate = await checkRateLimit(supabase, 'messages', 'sender_id', user.id, CHAT_UPLOADS_PER_MINUTE);
  if (!rate.ok) return { error: t(locale, 'messageRateLimited') };

  const { error: uploadError } = await supabase.storage
    .from(CHAT_MEDIA_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) return { error: uploadError.message };

  return { ref: toStorageRef(CHAT_MEDIA_BUCKET, path) };
}
