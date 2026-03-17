'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { reportUser, blockUser } from '@/app/actions/safety';
import { getSignedUrlForRef } from '@/app/actions/media';
import { useLanguage } from '@/contexts/LanguageContext';
import { formatRelativeTimeKey } from '@/lib/utils';
import type { Profile } from '@/types/database';
import Image from 'next/image';
import Link from 'next/link';
import { isStorageRef } from '@/lib/storageRef';

export default function ViewProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { t } = useLanguage();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [voiceUrl, setVoiceUrl] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      if (userId === user.id) {
        window.location.href = '/profile';
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .eq('is_visible', true)
        .single();

      if (!profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }

      setProfile(profileData as Profile);

      const { data: myMatches } = await supabase
        .from('matches')
        .select('id, user_a_id, user_b_id')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);

      const withThisUser = (myMatches ?? []).find(
        (m) => m.user_a_id === userId || m.user_b_id === userId
      );
      if (withThisUser) setMatchId(withThisUser.id);
      setLoading(false);
    }
    load();
  }, [userId, supabase]);

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

  if (loading) return <div className="flex min-h-screen items-center justify-center">{t('loading')}</div>;
  if (notFound || !profile)
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4">
        <p className="text-zinc-500">{t('somethingWentWrong')}</p>
        <Link href="/discovery" className="mt-4 text-rose-600 hover:underline">{t('backToHome')}</Link>
      </div>
    );

  async function handleReport() {
    const reason = window.prompt('Reason for report (optional):') || 'No reason given';
    await reportUser(userId, reason);
    setMenuOpen(false);
  }

  async function handleBlock() {
    if (!confirm('Block this user? You won\'t see each other in discovery.')) return;
    await blockUser(userId);
    setMenuOpen(false);
    router.push('/matches');
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/matches" className="text-rose-600">← {t('back')}</Link>
        <div className="flex items-center gap-2">
          {matchId && (
            <Link
              href={`/chat/${matchId}`}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600"
            >
              Message
            </Link>
          )}
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 text-zinc-600 hover:bg-zinc-50"
              aria-label={t('options')}
            >
              ⋮
            </button>
            {menuOpen && (
              <>
                <button type="button" className="fixed inset-0 z-0" onClick={() => setMenuOpen(false)} aria-label={t('close')} />
                <div className="absolute right-0 top-full z-10 mt-1 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                  <button type="button" onClick={handleReport} className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100">
                    Report
                  </button>
                  <button type="button" onClick={handleBlock} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                    Block
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
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
                <span className="flex h-full w-full items-center justify-center text-4xl font-bold text-white bg-gradient-to-br from-rose-200 to-amber-200">
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
            <p className="text-zinc-500">
              {profile.age ? `${profile.age} ${t('years')}` : ''} · {profile.city}
            </p>
            {profile.updated_at && (
              <p className="mt-1 text-xs text-zinc-400">
                {(() => { const r = formatRelativeTimeKey(profile.updated_at); return r.params ? t(r.key, r.params) : t(r.key); })()}
              </p>
            )}
            {profile.relationship_goal && (
              <p className="mt-1 text-sm text-zinc-500 capitalize">{profile.relationship_goal}</p>
            )}
          </div>

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
                    className="rounded-full bg-rose-100 px-3 py-1 text-sm text-rose-700"
                  >
                    {i}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {voiceUrl && (
            <div className="mt-6">
              <h2 className="text-sm font-medium text-zinc-500">Voice intro</h2>
              <audio
                src={voiceUrl}
                controls
                className="mt-2 w-full"
                preload="metadata"
              />
            </div>
          )}

          {matchId && profile.interests?.length ? (
            <div className="mt-4 rounded-lg border border-zinc-100 bg-zinc-50 p-3">
              <p className="text-xs font-medium text-zinc-500">{t('askAbout')}</p>
              <p className="mt-1 text-sm text-zinc-700">{profile.interests.slice(0, 3).join(', ')}</p>
            </div>
          ) : null}
          {matchId && (
            <Link
              href={`/chat/${matchId}`}
              className="mt-6 block w-full rounded-xl bg-rose-500 py-3 text-center font-medium text-white hover:bg-rose-600"
            >
              {t('sendMessage')}
            </Link>
          )}
        </div>
      </main>
    </div>
  );
}
