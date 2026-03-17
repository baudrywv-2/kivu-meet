'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function deleteAccount() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('profiles').delete().eq('id', user.id);
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect('/login');
}
