'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { unblockUser } from '@/app/actions/safety';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';
import type { Profile } from '@/types/database';

export default function BlockedUsersPage() {
  const { t } = useLanguage();
  const [blocked, setBlocked] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data: rows } = await supabase
        .from('blocked_users')
        .select('blocked_id')
        .eq('blocker_id', user.id);
      if (!rows?.length) {
        setLoading(false);
        return;
      }
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .in('id', rows.map((r) => r.blocked_id));
      setBlocked((profiles ?? []) as Profile[]);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleUnblock(id: string) {
    setUnblockingId(id);
    await unblockUser(id);
    setBlocked((prev) => prev.filter((p) => p.id !== id));
    setUnblockingId(null);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 flex items-center border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/settings" className="text-rose-600">← {t('back')}</Link>
        <h1 className="ml-4 text-xl font-bold text-zinc-900">{t('blockedUsers')}</h1>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-rose-500 border-t-transparent" />
          </div>
        ) : blocked.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-zinc-500">{t('noBlockedUsers')}</p>
            <Link href="/settings" className="mt-4 inline-block text-rose-600 hover:underline">
              {t('backToHome')}
            </Link>
          </div>
        ) : (
          <ul className="space-y-2">
            {blocked.map((profile) => (
              <li
                key={profile.id}
                className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-full bg-zinc-200">
                    {profile.avatar_url ? (
                      <Image src={profile.avatar_url} alt="" fill className="object-cover" sizes="48px" />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center bg-rose-200 text-lg font-bold text-white">
                        {profile.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900">{profile.name}</p>
                    <p className="text-sm text-zinc-500">{profile.city}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleUnblock(profile.id)}
                  disabled={unblockingId === profile.id}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
                >
                  {unblockingId === profile.id ? '…' : 'Unblock'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
