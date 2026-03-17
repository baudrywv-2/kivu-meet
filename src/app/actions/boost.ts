'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

const BOOST_DURATION_MINUTES = 30;

export async function boostProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const now = new Date().toISOString();
  const until = new Date(Date.now() + BOOST_DURATION_MINUTES * 60 * 1000).toISOString();

  const { error } = await supabase
    .from('profiles')
    .update({ profile_boosted_until: until, boost_started_at: now })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true, until };
}
