import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

/**
 * Send a push notification to all subscriptions for a user.
 * Call this from a Supabase Edge Function or webhook when a match is created or a message is sent.
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, VAPID_PRIVATE_KEY (and web-push package: npm i web-push).
 * Body: { userId: string, title: string, body: string, url?: string }
 * Optional header: x-push-secret (set PUSH_SEND_SECRET in env) to restrict who can call this.
 */
export async function POST(request: Request) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const vapidPrivate = process.env.VAPID_PRIVATE_KEY;
  const secret = process.env.PUSH_SEND_SECRET;

  if (!serviceKey || !vapidPrivate) {
    return NextResponse.json(
      { error: 'Push not configured (missing SUPABASE_SERVICE_ROLE_KEY or VAPID_PRIVATE_KEY)' },
      { status: 503 }
    );
  }

  if (secret && request.headers.get('x-push-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { userId: string; title: string; body: string; url?: string; type?: 'match' | 'message' };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, title, body: payloadBody, url = '/', type } = body;
  if (!userId || !title || !payloadBody) {
    return NextResponse.json({ error: 'Missing userId, title, or body' }, { status: 400 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { persistSession: false } }
  );

  if (type === 'match' || type === 'message') {
    const { data: profile } = await supabase.from('profiles').select('push_match_enabled, push_message_enabled').eq('id', userId).single();
    if (profile) {
      if (type === 'match' && profile.push_match_enabled === false) return NextResponse.json({ ok: true, sent: 0 });
      if (type === 'message' && profile.push_message_enabled === false) return NextResponse.json({ ok: true, sent: 0 });
    }
  }

  const { data: subs, error: fetchError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh_key, auth_key')
    .eq('user_id', userId);

  if (fetchError || !subs?.length) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  try {
    const webpush = await import('web-push');
    webpush.setVapidDetails(
      process.env.NEXT_PUBLIC_SITE_URL || 'mailto:hello@kivumeet.app',
      process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
      vapidPrivate
    );

    const payload = JSON.stringify({
      title,
      body: payloadBody,
      url,
      tag: `kivu-${userId}`,
    });

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          },
          payload
        );
        sent++;
      } catch {
        // Subscription may be invalid; skip
      }
    }
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    return NextResponse.json(
      { error: 'web-push not installed or invalid VAPID keys. Run: npm i web-push' },
      { status: 503 }
    );
  }
}
