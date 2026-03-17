'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function unmatch(matchId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('matches')
    .delete()
    .eq('id', matchId)
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

  if (error) return { error: error.message };
  return { success: true };
}
