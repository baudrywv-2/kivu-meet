'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types/database';
import { CONTENT_LIMITS } from '@/lib/constants';

function trimBio(bio: string | null | undefined): string | null {
  if (bio == null) return null;
  const t = bio.trim().slice(0, CONTENT_LIMITS.bio);
  return t || null;
}

export async function createOrUpdateProfile(data: Partial<Profile>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('profiles').upsert({
    id: user.id,
    email: user.email ?? data.email,
    name: (data.name ?? '').trim().slice(0, 100),
    age: data.age ?? null,
    city: (data.city ?? '').trim().slice(0, 100),
    bio: trimBio(data.bio),
    interests: data.interests ?? [],
    voice_intro_url: data.voice_intro_url ?? null,
    avatar_url: data.avatar_url ?? null,
    relationship_goal: data.relationship_goal ?? null,
    latitude: data.latitude ?? null,
    longitude: data.longitude ?? null,
    last_location_updated_at: data.latitude ? new Date().toISOString() : null,
  }, { onConflict: 'id' });

  if (error) return { error: error.message };

  // Referral (best-effort)
  const referrerId = (data as any)?.referrer_id as string | undefined;
  if (referrerId && referrerId !== user.id) {
    try {
      await supabase.from('referrals').insert({ referrer_id: referrerId, referred_user_id: user.id });
    } catch {
      // ignore
    }
  }
  redirect('/discovery');
}

export async function updateProfile(data: Partial<Profile>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const updates: Partial<Profile> = {
    name: data.name != null ? data.name.trim().slice(0, 100) : undefined,
    age: data.age,
    city: data.city != null ? data.city.trim().slice(0, 100) : undefined,
    bio: data.bio !== undefined ? trimBio(data.bio) : undefined,
    interests: data.interests,
    relationship_goal: data.relationship_goal,
    avatar_url: data.avatar_url,
    voice_intro_url: data.voice_intro_url,
    is_visible: data.is_visible,
    push_match_enabled: data.push_match_enabled,
    push_message_enabled: data.push_message_enabled,
  };
  const filtered = Object.fromEntries(
    Object.entries(updates).filter(([, v]) => v !== undefined)
  ) as Partial<Profile>;

  const { error } = await supabase
    .from('profiles')
    .update({ ...filtered, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}

export async function updateLocation(lat: number, lon: number) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase
    .from('profiles')
    .update({
      latitude: lat,
      longitude: lon,
      last_location_updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { error: error.message };
  return { success: true };
}
