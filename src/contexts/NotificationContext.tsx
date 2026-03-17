'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';

interface Toast {
  id: string;
  type: 'match' | 'message';
  title: string;
  body: string;
  link?: string;
}

const NotificationContext = createContext<{
  toasts: Toast[];
  dismiss: (id: string) => void;
}>({ toasts: [], dismiss: () => {} });

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = createClient();

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, [supabase]);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'matches' },
        async (payload) => {
          const m = payload.new as { id: string; user_a_id: string; user_b_id: string };
          const other = m.user_a_id === userId ? m.user_b_id : m.user_a_id;
          const { data: profile } = await supabase.from('profiles').select('name').eq('id', other).single();
          setToasts((prev) => [
            ...prev.slice(-4),
            {
              id: `match-${m.id}`,
              type: 'match',
              title: 'New match!',
              body: `You and ${profile?.name ?? 'Someone'} liked each other.`,
              link: `/chat/${m.id}`,
            },
          ]);
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new as { id: string; match_id: string; sender_id: string; content: string };
          if (msg.sender_id === userId) return;
          const { data: match } = await supabase.from('matches').select('user_a_id, user_b_id').eq('id', msg.match_id).single();
          if (!match) return;
          const otherId = match.user_a_id === userId ? match.user_b_id : match.user_a_id;
          const { data: profile } = await supabase.from('profiles').select('name').eq('id', otherId).single();
          setToasts((prev) => [
            ...prev.slice(-4),
            {
              id: `msg-${msg.id}`,
              type: 'message',
              title: profile?.name ?? 'New message',
              body: msg.content.slice(0, 50) + (msg.content.length > 50 ? '…' : ''),
              link: `/chat/${msg.match_id}`,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, supabase]);

  return (
    <NotificationContext.Provider value={{ toasts, dismiss }}>
      {children}
      <div className="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 md:left-auto md:right-4 md:max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-2 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg"
          >
            <div className="min-w-0 flex-1">
              <p className="font-medium text-zinc-900">{t.title}</p>
              <p className="truncate text-sm text-zinc-500">{t.body}</p>
            </div>
            <div className="flex shrink-0 gap-1">
              {t.link && (
                <Link href={t.link} className="rounded-lg bg-rose-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-600">
                  Open
                </Link>
              )}
              <button type="button" onClick={() => dismiss(t.id)} className="rounded-lg px-2 py-1 text-zinc-400 hover:bg-zinc-100">
                ×
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
