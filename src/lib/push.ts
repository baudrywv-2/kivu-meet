/**
 * Convert VAPID public key from base64 URL-safe to Uint8Array for PushManager.subscribe().
 */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawLength = raw.length;
  const buffer = new Uint8Array(new ArrayBuffer(rawLength));
  for (let i = 0; i < rawLength; i++) {
    buffer[i] = raw.charCodeAt(i);
  }
  return buffer;
}

export interface PushSubscriptionPayload {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/**
 * Subscribe to push notifications. Returns subscription JSON for sending to backend.
 * Requires NEXT_PUBLIC_VAPID_PUBLIC_KEY (base64url) to be set.
 */
export async function subscribeToPush(
  registration: ServiceWorkerRegistration
): Promise<PushSubscriptionPayload | null> {
  const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  if (!key || typeof window === 'undefined' || !('PushManager' in window)) {
    return null;
  }
  try {
    const existing = await registration.pushManager.getSubscription();
    if (existing) return existing.toJSON() as PushSubscriptionPayload;
    const applicationServerKey = urlBase64ToUint8Array(key);
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: applicationServerKey as BufferSource,
    });
    return sub.toJSON() as PushSubscriptionPayload;
  } catch {
    return null;
  }
}
