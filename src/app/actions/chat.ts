'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { checkRateLimit } from '@/lib/rateLimit';
import { CONTENT_LIMITS } from '@/lib/constants';
import { t } from '@/lib/i18n';

const MESSAGES_PER_MINUTE = 30;

const VOICE_PREFIX = '[voice]';
const IMAGE_PREFIX = '[image]';

export async function sendMessage(matchId: string, content: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const locale: 'en' | 'fr' | 'sw' | 'ln' = (user.user_metadata?.locale ?? 'en') as any;

  const raw = content.trim();
  const isVoice = raw.startsWith(VOICE_PREFIX);
  const isImage = raw.startsWith(IMAGE_PREFIX);
  const text = raw.slice(0, isVoice || isImage ? 2048 : CONTENT_LIMITS.message);
  if (!text) return { error: t(locale, 'messageEmpty') };

  const rate = await checkRateLimit(supabase, 'messages', 'sender_id', user.id, MESSAGES_PER_MINUTE);
  if (!rate.ok) return { error: t(locale, 'messageRateLimited') };

  const { error } = await supabase.from('messages').insert({
    match_id: matchId,
    sender_id: user.id,
    content: text,
  });

  if (error) return { error: error.message };

  try {
    const { data: matchRow } = await supabase.from('matches').select('user_a_id, user_b_id').eq('id', matchId).single();
    const otherId = matchRow ? (matchRow.user_a_id === user.id ? matchRow.user_b_id : matchRow.user_a_id) : null;
    if (otherId) {
      const { data: senderProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      const senderName = senderProfile?.name ?? 'Someone';
      const preview = isVoice ? '🎤 Voice message' : isImage ? '🖼 Photo' : text.slice(0, 50) + (text.length > 50 ? '…' : '');
      const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      await fetch(`${base}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PUSH_SEND_SECRET && { 'x-push-secret': process.env.PUSH_SEND_SECRET }),
        },
        body: JSON.stringify({
          userId: otherId,
          title: senderName,
          body: preview,
          url: `/chat/${matchId}`,
          type: 'message',
        }),
      });
    }
  } catch {
    // Push optional
  }
  return { success: true };
}

export async function sendMessageWithClientId(matchId: string, content: string, clientMessageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const locale: 'en' | 'fr' | 'sw' | 'ln' = (user.user_metadata?.locale ?? 'en') as any;

  // Block enforcement: if either participant blocked the other, deny sending.
  const { data: matchRow } = await supabase.from('matches').select('user_a_id, user_b_id').eq('id', matchId).single();
  const otherId = matchRow ? (matchRow.user_a_id === user.id ? matchRow.user_b_id : matchRow.user_a_id) : null;
  if (otherId) {
    const { data: blocked } = await supabase
      .from('blocked_users')
      .select('blocker_id')
      .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${user.id})`)
      .maybeSingle();
    if (blocked) return { error: 'Blocked user' };
  }

  const raw = content.trim();
  const isVoice = raw.startsWith(VOICE_PREFIX);
  const isImage = raw.startsWith(IMAGE_PREFIX);
  const text = raw.slice(0, isVoice || isImage ? 2048 : CONTENT_LIMITS.message);
  if (!text) return { error: t(locale, 'messageEmpty') };

  const rate = await checkRateLimit(supabase, 'messages', 'sender_id', user.id, MESSAGES_PER_MINUTE);
  if (!rate.ok) return { error: t(locale, 'messageRateLimited') };

  const { error } = await supabase.from('messages').insert({
    match_id: matchId,
    sender_id: user.id,
    content: text,
    client_message_id: clientMessageId,
  });

  if (error) return { error: error.message };
  // Push to recipient (best-effort)
  try {
    const { data: matchRow2 } = await supabase.from('matches').select('user_a_id, user_b_id').eq('id', matchId).single();
    const otherId2 = matchRow2 ? (matchRow2.user_a_id === user.id ? matchRow2.user_b_id : matchRow2.user_a_id) : null;
    if (otherId2) {
      const { data: senderProfile } = await supabase.from('profiles').select('name').eq('id', user.id).single();
      const senderName = senderProfile?.name ?? 'Someone';
      const base = process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
      await fetch(`${base}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PUSH_SEND_SECRET && { 'x-push-secret': process.env.PUSH_SEND_SECRET }),
        },
        body: JSON.stringify({
          userId: otherId2,
          title: senderName,
          body: text.slice(0, 60) + (text.length > 60 ? '…' : ''),
          url: `/chat/${matchId}`,
          type: 'message',
        }),
      });
    }
  } catch {
    // optional
  }
  return { success: true };
}

export async function markMessagesRead(matchId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('match_id', matchId)
    .neq('sender_id', user.id)
    .is('read_at', null);
}

export async function upsertMessageReceipt(params: { messageId: string; delivered?: boolean; read?: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const patch: { message_id: string; user_id: string; delivered_at?: string; read_at?: string } = {
    message_id: params.messageId,
    user_id: user.id,
  };
  const now = new Date().toISOString();
  if (params.delivered) patch.delivered_at = now;
  if (params.read) patch.read_at = now;

  const { error } = await supabase
    .from('message_receipts')
    .upsert(patch, { onConflict: 'message_id,user_id' });
  if (error) return { error: error.message };
  return { success: true };
}

export async function toggleReaction(params: { messageId: string; emoji: string }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const emoji = params.emoji.trim().slice(0, 8);
  if (!emoji) return { error: 'Invalid emoji' };

  const { data: existing } = await supabase
    .from('message_reactions')
    .select('id')
    .eq('message_id', params.messageId)
    .eq('user_id', user.id)
    .eq('emoji', emoji)
    .maybeSingle();

  if (existing?.id) {
    const { error } = await supabase.from('message_reactions').delete().eq('id', existing.id);
    if (error) return { error: error.message };
    return { success: true, active: false };
  }

  const { error } = await supabase.from('message_reactions').insert({
    message_id: params.messageId,
    user_id: user.id,
    emoji,
  });
  if (error) return { error: error.message };
  return { success: true, active: true };
}

export async function deleteMessageForMe(messageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await supabase.from('message_hidden').insert({
    message_id: messageId,
    user_id: user.id,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function deleteMessageForEveryone(messageId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: msg, error: fetchError } = await supabase
    .from('messages')
    .select('sender_id')
    .eq('id', messageId)
    .single();
  if (fetchError) return { error: fetchError.message };
  if (msg?.sender_id !== user.id) return { error: 'Forbidden' };

  const { error } = await supabase
    .from('messages')
    .update({
      deleted_at: new Date().toISOString(),
      deleted_by: user.id,
      content: '[deleted]',
    })
    .eq('id', messageId);
  if (error) return { error: error.message };
  return { success: true };
}
