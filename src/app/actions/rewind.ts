'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const FREE_REWINDS_PER_DAY = 3;

export async function useRewind(): Promise<{ ok: boolean; error?: string; limitReached?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user.id).single();
  const isPremium = profile?.subscription_tier === 'premium';
  if (isPremium) return { ok: true };

  const day = new Date().toISOString().slice(0, 10);
  const { data: row } = await supabase.from('daily_usage').select('*').eq('user_id', user.id).eq('day', day).maybeSingle();
  const used = row?.rewinds_used ?? 0;
  if (used >= FREE_REWINDS_PER_DAY) return { ok: false, limitReached: true, error: 'Rewind limit reached. Get Premium for unlimited rewinds.' };

  await supabase.from('daily_usage').upsert({ user_id: user.id, day, rewinds_used: used + 1 }, { onConflict: 'user_id,day' });
  return { ok: true };
}

// Back-compat alias with a non-hook name (this is a server action, not a React hook).
export const consumeRewind = useRewind;

