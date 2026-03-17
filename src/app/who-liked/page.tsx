'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { EmptyState } from '@/components/EmptyState';
import { PageSkeleton } from '@/components/PageSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';
import Image from 'next/image';
import type { Profile } from '@/types/database';

export default function WhoLikedPage() {
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const supabase = createClient();

  async function load() {
    setError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      window.location.href = '/login';
      return;
    }
    try {
      const { data: myProfile, error: profileError } = await supabase
        .from('profiles')
        .select('subscription_tier')
        .eq('id', user.id)
        .single();
      if (profileError) throw profileError;
      setIsPremium(myProfile?.subscription_tier === 'premium');

      const { data: blockedRows, error: blockedError } = await supabase
        .from('blocked_users')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      if (blockedError) throw blockedError;
      const blockedIds = new Set(
        (blockedRows ?? []).flatMap((b) => {
          if ((b as any).blocker_id === user.id) return [(b as any).blocked_id];
          if ((b as any).blocked_id === user.id) return [(b as any).blocker_id];
          return [];
        })
      );

      const { data: likes, error: likesError } = await supabase
        .from('likes')
        .select('liker_id')
        .eq('liked_id', user.id);
      if (likesError) throw likesError;

      const likerIdsRaw = [...new Set((likes ?? []).map((l) => l.liker_id))];
      const likerIds = likerIdsRaw.filter((id) => !blockedIds.has(id));
      setCount(likerIds.length);

      if (likerIds.length > 0 && myProfile?.subscription_tier === 'premium') {
        const { data: profs, error: profsError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', likerIds);
        if (profsError) throw profsError;
        setProfiles((profs ?? []) as Profile[]);
      } else {
        setProfiles([]);
      }
    } catch {
      setError('Could not load likes.');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [supabase]);

  if (loading) return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/discovery" className="text-rose-600">← {t('back')}</Link>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">{t('whoLikedYou')}</h1>
      </header>
      <main className="flex justify-center p-4">
        <PageSkeleton variant="centered" />
      </main>
    </div>
  );
  if (error) return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/discovery" className="text-rose-600">← {t('back')}</Link>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">{t('whoLikedYou')}</h1>
      </header>
      <main className="p-4">
        <ErrorState message={error} onRetry={load} />
      </main>
    </div>
  );

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/discovery" className="text-rose-600">← {t('back')}</Link>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">{t('whoLikedYou')}</h1>
      </header>

      <main className="mx-auto max-w-lg p-4">
        {count === 0 ? (
          <EmptyState
            emoji="💕"
            title={t('noMatchesYet')}
            description={t('noMatchesDesc')}
            actionLabel={t('goToDiscovery')}
            actionHref="/discovery"
          />
        ) : isPremium ? (
          <div className="space-y-2">
            <p className="mb-4 text-zinc-600">{count} {count === 1 ? t('matches') : t('likes')}</p>
            {profiles.map((p) => (
              <Link
                key={p.id}
                href={`/profile/${p.id}`}
                className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm transition hover:bg-zinc-50"
              >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                  {p.avatar_url ? (
                    <Image src={p.avatar_url} alt="" fill className="object-cover" sizes="56px" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center bg-rose-200 text-xl font-bold text-white">{p.name.charAt(0)}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">{p.name}, {p.age ?? '?'}</p>
                  <p className="text-sm text-zinc-500">{p.city}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-zinc-600">{count} {count === 1 ? t('matches') : t('likes')}</p>
            <div className="relative overflow-hidden rounded-2xl">
              <div className="flex gap-3 p-4 blur-md select-none pointer-events-none">
                {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                  <div key={i} className="h-20 w-20 shrink-0 rounded-full bg-zinc-300" />
                ))}
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm p-6 text-center">
                <p className="text-lg font-semibold text-zinc-800">{t('upgradePremium')}</p>
                <p className="mt-1 text-sm text-zinc-500">{t('upgradePremiumDesc')}</p>
                <Link href="/premium" className="mt-4 rounded-xl bg-rose-500 px-6 py-2.5 text-sm font-medium text-white hover:bg-rose-600">{t('upgradePremium')}</Link>
                <Link href="/discovery" className="mt-3 text-sm text-zinc-500 hover:text-zinc-700">{t('goToDiscovery')}</Link>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
