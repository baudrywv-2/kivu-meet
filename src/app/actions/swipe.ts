'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rateLimit';

const SUPER_LIKE_FREE_PER_DAY = 1;
const LIKES_PER_MINUTE = 40;

export async function likeUser(likedId: string, isSuperLike = false): Promise<{ success?: boolean; error?: string; matched?: boolean; matchId?: string; limitReached?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Block enforcement (both directions)
  const { data: blocked } = await supabase
    .from('blocked_users')
    .select('blocker_id, blocked_id')
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${likedId}),and(blocker_id.eq.${likedId},blocked_id.eq.${user.id})`)
    .maybeSingle();
  if (blocked) return { error: 'Blocked user' };

  const rate = await checkRateLimit(supabase, 'likes', 'liker_id', user.id, LIKES_PER_MINUTE);
  if (!rate.ok) return { error: rate.error };

  if (isSuperLike) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();
    const isPremium = profile?.subscription_tier === 'premium';
    if (!isPremium) {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('liker_id', user.id)
        .eq('is_super_like', true)
        .gte('created_at', since);
      if ((count ?? 0) >= SUPER_LIKE_FREE_PER_DAY) {
        return { error: 'You’ve used your free super like for today. Get more with Premium!', limitReached: true };
      }
    }
  }

  const { error } = await supabase.from('likes').insert({
    liker_id: user.id,
    liked_id: likedId,
    is_super_like: isSuperLike,
  });

  if (error) return { error: error.message };

  const userA = [user.id, likedId].sort()[0];
  const userB = [user.id, likedId].sort()[1];
  const { data: match } = await supabase
    .from('matches')
    .select('id')
    .eq('user_a_id', userA)
    .eq('user_b_id', userB)
    .single();

  if (match) {
    try {
      const { data: myProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      const myName = myProfile?.name ?? 'Someone';
      const base = process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000';
      await fetch(`${base}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PUSH_SEND_SECRET && { 'x-push-secret': process.env.PUSH_SEND_SECRET }),
        },
        body: JSON.stringify({
          userId: likedId,
          title: 'New match!',
          body: `You and ${myName} liked each other. Say hi!`,
          url: '/matches',
          type: 'match',
        }),
      });
    } catch {
      // Push optional; ignore
    }
    return { success: true, matched: true, matchId: match.id };
  }
  return { success: true };
}

export async function passUser(passedId: string) {
  // Pass = no action; we could store in a "passed" table for "rewind" feature
  return { success: true };
}
