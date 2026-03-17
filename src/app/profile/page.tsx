'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import type { Profile } from '@/types/database';
import Image from 'next/image';
import Link from 'next/link';
import { boostProfile } from '@/app/actions/boost';
import { BottomNav } from '@/components/BottomNav';
import { PageSkeleton } from '@/components/PageSkeleton';
import { getSignedUrlForRef } from '@/app/actions/media';
import { isStorageRef } from '@/lib/storageRef';

function profileCompleteness(p: Profile): number {
  let n = 0;
  if (p.avatar_url) n += 1;
  if (p.bio && p.bio.trim().length >= 20) n += 1;
  if (p.voice_intro_url) n += 1;
  if (p.interests?.length) n += 1;
  return Math.round((n / 4) * 100);
}

export default function ProfilePage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [boostUntil, setBoostUntil] = useState<string | null>(null);
  const [boosting, setBoosting] = useState(false);
  const [boostToast, setBoostToast] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const [boostViews, setBoostViews] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data as Profile);
      setBoostUntil((data as Profile).profile_boosted_until ?? null);
      const started = (data as any)?.boost_started_at as string | null | undefined;
      if (started) {
        const { count } = await supabase
          .from('profile_views')
          .select('*', { count: 'exact', head: true })
          .eq('viewed_id', user.id)
          .gte('created_at', started);
        setBoostViews(count ?? 0);
      } else {
        setBoostViews(null);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      const v = profile?.voice_intro_url ?? null;
      if (!v) {
        setVoiceUrl(null);
        return;
      }
      if (!isStorageRef(v)) {
        setVoiceUrl(v);
        return;
      }
      const res = await getSignedUrlForRef(v);
      if (!cancelled) setVoiceUrl(res.url ?? null);
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [profile?.voice_intro_url]);

  if (loading) return <PageSkeleton variant="centered" />;
  if (!profile) return null;

  const completeness = profileCompleteness(profile);

  return (
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {boostToast && (
        <div className="fixed bottom-24 left-4 right-4 z-40 mx-auto max-w-sm rounded-lg bg-zinc-800 px-4 py-3 text-center text-sm text-white shadow-lg animate-toast-in">
          ✨ {t('boostSuccess')}
        </div>
      )}
      <header className="sticky top-0 z-10 flex items-center border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-sm">
        <Link href="/discovery" className="text-xs font-medium text-black hover:opacity-80">← {t('back')}</Link>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/profile/edit" className="rounded-lg bg-[#fffc00] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#e6e300]">
            {t('editProfile')}
          </Link>
          <LanguageSelector compact />
        </div>
      </header>

      <main className="mx-auto max-w-lg p-3 sm:p-4">
        {completeness < 100 && (
          <div className="mb-4 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-700">{t('profileCompletePercent', { percent: String(completeness) })}</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
              <div
                className="h-full rounded-full bg-[#fffc00] transition-all duration-300"
                style={{ width: `${completeness}%` }}
              />
            </div>
            {(!profile.avatar_url || !profile.bio) && (
              <Link href="/profile/edit" className="mt-3 flex items-center gap-2 text-left text-xs text-black">
                <span className="text-lg">✨</span>
                <div>
                  <p className="font-medium">{t('completeProfile')}</p>
                  <p className="text-black/80">{t('completeProfileDesc')}</p>
                </div>
              </Link>
            )}
            {profile.avatar_url && profile.bio && !profile.voice_intro_url && (
              <Link href="/profile/edit" className="mt-3 flex items-center gap-2 text-left text-xs text-black">
                <span className="text-lg">🎤</span>
                <p className="font-medium">{t('addVoiceIntroCta')}</p>
              </Link>
            )}
          </div>
        )}
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col items-center">
            <div className="relative h-32 w-32 overflow-hidden rounded-full bg-zinc-200">
              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.name}
                  fill
                  className="object-cover"
                  sizes="128px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-[#fffc00]/40 to-amber-200">
                  {profile.name.charAt(0)}
                </span>
              )}
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <h1 className="text-xl font-bold text-zinc-900">{profile.name}</h1>
              {profile.is_verified && (
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#fffc00] text-xs text-black" title={t('verifiedBadge')} aria-label={t('verifiedBadge')}>
                  ✓
                </span>
              )}
            </div>
            <p className="text-sm text-zinc-500">
              {profile.age ? `${profile.age} ${t('years')}` : ''} · {profile.city}
            </p>
            {profile.relationship_goal && (
              <p className="mt-1 text-sm text-zinc-500 capitalize">{profile.relationship_goal}</p>
            )}
          </div>

          {voiceUrl && (
            <div className="mt-4 w-full">
              <h2 className="text-sm font-medium text-zinc-500">Voice intro</h2>
              <audio
                controls
                src={voiceUrl}
                className="mt-2 w-full"
              />
            </div>
          )}

          {profile.bio && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-zinc-500">Bio</h2>
              <p className="mt-1 text-zinc-800">{profile.bio}</p>
            </div>
          )}

          {profile.interests?.length ? (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-zinc-500">Interests</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {profile.interests.map((i) => (
                  <span
                    key={i}
                    className="rounded-full bg-[#fffc00]/30 px-3 py-1 text-sm text-black"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {(boostUntil && new Date(boostUntil) > new Date()) ? (
            <p className="mt-3 rounded-lg bg-[#fffc00]/20 py-2 text-center text-xs text-black">
              ✨ {t('profileBoosted')}
            </p>
          ) : (
            <form action={async () => {
              setBoosting(true);
              await boostProfile();
              setBoostUntil(new Date(Date.now() + 30 * 60 * 1000).toISOString());
              setBoosting(false);
              setBoostToast(true);
              setTimeout(() => setBoostToast(false), 4000);
            }} className="mt-4">
              <button type="submit" disabled={boosting} className="w-full rounded-lg border border-zinc-200 py-2 text-xs font-medium text-black hover:bg-zinc-50 disabled:opacity-50">
                {boosting ? '…' : t('boostProfile')}
              </button>
            </form>
          )}
          {boostViews != null && (boostUntil && new Date(boostUntil) > new Date()) && (
            <p className="mt-2 text-center text-xs text-zinc-500">
              Views during boost: {boostViews}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2">
            <Link href="/who-liked" className="rounded-lg bg-[#fffc00] py-2.5 text-center text-sm font-bold text-black hover:bg-[#e6e300]">
              {t('whoLikedYou')}
            </Link>
            <div className="flex gap-2">
              <Link href="/profile/edit" className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-stone-700 hover:bg-zinc-50">
                {t('editProfile')}
              </Link>
              <Link href="/settings" className="flex-1 rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-stone-700 hover:bg-zinc-50">
                {t('settings')}
              </Link>
            </div>
          </div>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
