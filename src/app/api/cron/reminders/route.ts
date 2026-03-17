import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();

  // Find users with matches created in last 24h and no messages sent
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recentMatches } = await admin
    .from('matches')
    .select('id, user_a_id, user_b_id, created_at')
    .gte('created_at', since);

  if (!recentMatches?.length) return NextResponse.json({ ok: true, reminded: 0 });

  const matchIds = recentMatches.map((m) => m.id);
  const { data: anyMessages } = await admin
    .from('messages')
    .select('match_id')
    .in('match_id', matchIds)
    .limit(5000);
  const hasMsg = new Set((anyMessages ?? []).map((m) => m.match_id));

  const remindUserIds = new Set<string>();
  for (const m of recentMatches) {
    if (hasMsg.has(m.id)) continue;
    remindUserIds.add(m.user_a_id);
    remindUserIds.add(m.user_b_id);
  }

  let reminded = 0;
  const base = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  for (const userId of remindUserIds) {
    try {
      await fetch(`${base}/api/push/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.PUSH_SEND_SECRET && { 'x-push-secret': process.env.PUSH_SEND_SECRET }),
        },
        body: JSON.stringify({
          userId,
          title: 'Say hi!',
          body: 'You have a new match. Start the conversation.',
          url: '/matches',
          type: 'match',
        }),
      });
      reminded++;
    } catch {
      // ignore
    }
  }

  return NextResponse.json({ ok: true, reminded });
}

