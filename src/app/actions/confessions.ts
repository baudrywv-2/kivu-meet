'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rateLimit';
import { CONTENT_LIMITS } from '@/lib/constants';

const CONFESSION_LIKES_PER_MINUTE = 30;
const CONFESSION_COMMENTS_PER_MINUTE = 15;

export async function postConfession(city: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const text = content.trim().slice(0, CONTENT_LIMITS.confession);
  if (!text) return { error: 'Confession cannot be empty.' };

  const { error } = await supabase.from('confessions').insert({
    city: city.trim().slice(0, 100),
    content: text,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function likeConfession(confessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const rate = await checkRateLimit(supabase, 'confession_likes', 'user_id', user.id, CONFESSION_LIKES_PER_MINUTE);
  if (!rate.ok) return { error: rate.error };

  const { error } = await supabase.from('confession_likes').upsert(
    { confession_id: confessionId, user_id: user.id },
    { onConflict: 'confession_id,user_id' }
  );

  if (error) return { error: error.message };
  return { success: true };
}

export async function unlikeConfession(confessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  await supabase
    .from('confession_likes')
    .delete()
    .eq('confession_id', confessionId)
    .eq('user_id', user.id);

  return { success: true };
}

export async function commentConfession(
  confessionId: string,
  content: string,
  isAnonymous = true
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  if (!isAnonymous) {
    const rate = await checkRateLimit(supabase, 'confession_comments', 'user_id', user.id, CONFESSION_COMMENTS_PER_MINUTE);
    if (!rate.ok) return { error: rate.error };
  }

  const text = content.trim().slice(0, CONTENT_LIMITS.confessionComment);
  if (!text) return { error: 'Comment cannot be empty.' };

  const { error } = await supabase.from('confession_comments').insert({
    confession_id: confessionId,
    user_id: isAnonymous ? null : user.id,
    content: text,
    is_anonymous: isAnonymous,
  });

  if (error) return { error: error.message };
  return { success: true };
}
