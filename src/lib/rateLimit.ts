import type { SupabaseClient } from '@supabase/supabase-js';

const WINDOW_MS = 60 * 1000; // 1 minute

export async function checkRateLimit(
  supabase: SupabaseClient,
  table: 'likes' | 'messages' | 'confession_likes' | 'confession_comments' | 'profiles',
  userIdColumn: string,
  userId: string,
  maxPerWindow: number,
  windowMs: number = WINDOW_MS
): Promise<{ ok: boolean; error?: string }> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq(userIdColumn, userId)
    .gte('created_at', since);

  if (error) return { ok: true }; // don't block on count failure
  if ((count ?? 0) >= maxPerWindow) {
    return {
      ok: false,
      error: 'Too many requests. Please wait a moment and try again.',
    };
  }
  return { ok: true };
}
