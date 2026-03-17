'use client';

import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { subscribeToPush } from '@/lib/push';

/**
 * Registers the service worker and subscribes to push when user is authenticated.
 * Sends subscription to /api/push/register for storage (so backend can send pushes when app is in background).
 */
export function PushRegistration() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

    async function register() {
      const { data: { user } } = await createClient().auth.getUser();
      if (!user) return;

      try {
        const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await reg.update();

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const subscription = await subscribeToPush(reg);
        if (!subscription) return;

        const res = await fetch('/api/push/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
            keys: subscription.keys,
          }),
          credentials: 'same-origin',
        });
        if (res.ok) done.current = true;
      } catch {
        // Silently fail (e.g. no VAPID key, push not supported)
      }
    }

    register();
  }, []);

  return null;
}
