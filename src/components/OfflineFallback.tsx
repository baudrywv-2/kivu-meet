'use client';

import { useEffect, useState } from 'react';

export function OfflineFallback() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setIsOnline(navigator.onLine);

    function handleOnline() {
      setIsOnline(true);
    }

    function handleOffline() {
      setIsOnline(false);
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="sticky top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-black">
      <span aria-hidden>📡</span>
      <span>You’re offline. Some features may not work.</span>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded bg-black/10 px-2 py-1 text-xs font-bold hover:bg-black/20"
      >
        Retry
      </button>
    </div>
  );
}
