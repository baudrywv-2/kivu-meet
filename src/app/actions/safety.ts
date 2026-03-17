'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { CONTENT_LIMITS } from '@/lib/constants';

export async function blockUser(blockedId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('blocked_users').insert({
    blocker_id: user.id,
    blocked_id: blockedId,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function reportUser(
  targetUserId: string,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    report_type: 'user',
    target_user_id: targetUserId,
    reason: reason.trim().slice(0, CONTENT_LIMITS.reportReason) || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function unblockUser(blockedId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId);

  if (error) return { error: error.message };
  return { success: true };
}

export async function reportConfession(
  targetConfessionId: string,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    report_type: 'confession',
    target_confession_id: targetConfessionId,
    reason: reason.trim().slice(0, CONTENT_LIMITS.reportReason) || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}

export async function reportMessage(
  targetMessageId: string,
  reason: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    report_type: 'message',
    target_message_id: targetMessageId,
    reason: reason.trim().slice(0, CONTENT_LIMITS.reportReason) || null,
  });

  if (error) return { error: error.message };
  return { success: true };
}
