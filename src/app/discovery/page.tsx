'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { ProfileCard } from '@/components/ProfileCard';
import { PageSkeleton } from '@/components/PageSkeleton';
import { EmptyState } from '@/components/EmptyState';
import { ErrorState } from '@/components/ErrorState';
import { likeUser } from '@/app/actions/swipe';
import { blockUser, reportUser } from '@/app/actions/safety';
import { updateLocation } from '@/app/actions/profile';
import { useLanguage } from '@/contexts/LanguageContext';
import { playMatchSound } from '@/lib/sound';
import { LanguageSelector } from '@/components/LanguageSelector';
import type { Profile } from '@/types/database';
import Link from 'next/link';
import Image from 'next/image';
import { BottomNav } from '@/components/BottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { INTERESTS, RELATIONSHIP_GOALS } from '@/lib/constants';
import { consumeRewind } from '@/app/actions/rewind';

export default function DiscoveryPage() {
  const { t } = useLanguage();
  const [profiles, setProfiles] = useState<(Profile & { score?: number })[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [matchModal, setMatchModal] = useState<{ matchId: string; name: string; avatarUrl?: string | null } | null>(null);
  const [navUnread, setNavUnread] = useState(0);
  const [ageMin, setAgeMin] = useState(18);
  const [ageMax, setAgeMax] = useState(99);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number | null>(null);
  const [goalFilter, setGoalFilter] = useState<string>('');
  const [interestFilters, setInterestFilters] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [isBoosted, setIsBoosted] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [superLikeError, setSuperLikeError] = useState<string | null>(null);
  const [likeError, setLikeError] = useState<string | null>(null);
  const [locationPrompt, setLocationPrompt] = useState<'idle' | 'asking' | 'granted' | 'denied'>('idle');
  const [lastPassedIndex, setLastPassedIndex] = useState<number | null>(null);
  const [cardExit, setCardExit] = useState<'left' | 'right' | null>(null);
  const matchModalRef = useRef<HTMLDivElement | null>(null);
  const matchModalPrimaryRef = useRef<HTMLAnchorElement | null>(null);
  const filtersFirstInputRef = useRef<HTMLInputElement | null>(null);
  const filtersDoneRef = useRef<HTMLButtonElement | null>(null);
  const filtersButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const supabase = createClient();

  const DISTANCE_OPTIONS: { value: number | null; label: string }[] = [
    { value: null, label: t('anyDistance') },
    { value: 5, label: t('within5km') },
    { value: 10, label: t('within10km') },
    { value: 25, label: t('within25km') },
    { value: 50, label: t('within50km') },
    { value: 100, label: t('within100km') },
  ];

  useEffect(() => {
    async function fetchNavUnread() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: matches } = await supabase
        .from('matches')
        .select('id')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`);
      if (!matches?.length) return;
      const { count } = await supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('match_id', matches.map((m) => m.id))
        .neq('sender_id', user.id)
        .is('read_at', null);
      setNavUnread(count ?? 0);
    }
    fetchNavUnread();
  }, [supabase, matchModal]);

  useEffect(() => {
    setLoadError(null);
    async function loadProfiles() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }

      try {
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!myProfile) {
        window.location.href = '/onboarding';
        return;
      }

      const boostedUntil = (myProfile as Profile).profile_boosted_until;
      setIsBoosted(!!boostedUntil && new Date(boostedUntil) > new Date());

      const hasLocation = myProfile.latitude != null && myProfile.longitude != null;
      if (!hasLocation) setLocationPrompt('asking');

      const { data: myLikes } = await supabase
        .from('likes')
        .select('liked_id')
        .eq('liker_id', user.id);

      const likedIds = new Set((myLikes ?? []).map((l) => l.liked_id));

      const { data: blocked } = await supabase
        .from('blocked_users')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);

      const blockedIds = new Set(
        (blocked ?? []).flatMap((b) => {
          // if I blocked them => exclude blocked_id; if they blocked me => exclude blocker_id
          if (b.blocker_id === user.id) return [b.blocked_id];
          if (b.blocked_id === user.id) return [b.blocker_id];
          return [];
        })
      );

      const excludeIds = [...likedIds, ...blockedIds];
      let query = supabase
        .from('profiles')
        .select('*')
        .eq('is_visible', true)
        .neq('id', user.id);

      if (excludeIds.length > 0) {
        query = query.not('id', 'in', `(${excludeIds.join(',')})`);
      }
      if (myProfile.city) {
        query = query.eq('city', myProfile.city);
      }
      query = query.gte('age', ageMin).lte('age', ageMax);
      if (goalFilter) query = query.eq('relationship_goal', goalFilter);

      const { data: candidates } = await query.limit(50);

      if (!candidates?.length) {
        setLoading(false);
        return;
      }

      const { data: likesReceived } = await supabase
        .from('likes')
        .select('liked_id')
        .in('liked_id', candidates.map((c) => c.id));

      const likesCountMap = new Map<string, number>();
      (likesReceived ?? []).forEach((l) => {
        likesCountMap.set(l.liked_id, (likesCountMap.get(l.liked_id) ?? 0) + 1);
      });

      const { computeMatchScore } = await import('@/lib/matching/algorithm');
      const { haversineKm } = await import('@/lib/utils');
      const myLat = myProfile.latitude ?? null;
      const myLon = myProfile.longitude ?? null;

      const scored = candidates
        .filter((c) => !likedIds.has(c.id) && !blockedIds.has(c.id))
        .filter((c) => {
          if (!interestFilters.length) return true;
          const set = new Set((c as any).interests ?? []);
          return interestFilters.some((i) => set.has(i));
        })
        .map((c) => {
          const distanceKm =
            myLat != null && myLon != null && c.latitude != null && c.longitude != null
              ? haversineKm(myLat, myLon, c.latitude, c.longitude)
              : null;
          return {
            ...c,
            distanceKm: distanceKm ?? undefined,
            score: computeMatchScore({
            currentUser: myProfile as Profile,
            candidate: c as Profile,
            candidateLastActive: c.updated_at,
            candidateMatchesCount: 0,
            candidateMessagesSentCount: 0,
            candidateLikesReceivedCount: likesCountMap.get(c.id) ?? 0,
          }),
          };
        })
        .sort((a, b) => {
          const scoreDiff = (b.score ?? 0) - (a.score ?? 0);
          if (scoreDiff !== 0) return scoreDiff;
          if (a.distanceKm != null && b.distanceKm != null) return a.distanceKm - b.distanceKm;
          return 0;
        });

      const filtered =
        maxDistanceKm != null
          ? scored.filter((c) => c.distanceKm == null || c.distanceKm <= maxDistanceKm)
          : scored;

      setProfiles(filtered);
      } catch (e) {
        setLoadError(t('loadError'));
      }
      setLoading(false);
    }
    loadProfiles();
  }, [supabase, ageMin, ageMax, maxDistanceKm, goalFilter, interestFilters, retryCount]);

  async function handleAllowLocation() {
    if (!navigator.geolocation) {
      setLocationPrompt('denied');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        await updateLocation(latitude, longitude);
        setLocationPrompt('granted');
        setLoading(true);
        window.location.reload();
      },
      () => setLocationPrompt('denied')
    );
  }

  async function handleLike() {
    const profile = profiles[currentIndex];
    if (!profile) return;
    setLikeError(null);
    setCardExit('right');
    const result = await likeUser(profile.id);
    if (result?.error && result.limitReached) {
      setCardExit(null);
      return;
    }
    if (result?.error) {
      setLikeError(result.error);
      setCardExit(null);
      return;
    }
    if (result?.matched && result.matchId) {
      setMatchModal({ matchId: result.matchId, name: profile.name, avatarUrl: profile.avatar_url });
      playMatchSound();
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    }
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, profiles.length - 1));
      setCardExit(null);
    }, 280);
  }

  async function handlePass() {
    setLastPassedIndex(currentIndex);
    setCardExit('left');
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, profiles.length - 1));
      setCardExit(null);
    }, 280);
  }

  function handleUndoPass() {
    if (lastPassedIndex !== null) {
      consumeRewind().then((res) => {
        if (!res.ok) return;
        setCurrentIndex(lastPassedIndex);
        setLastPassedIndex(null);
      });
    }
  }

  async function handleBlock(userId: string) {
    await blockUser(userId);
    setCurrentIndex((i) => Math.min(i + 1, profiles.length - 1));
  }

  async function handleReport(userId: string) {
    const reason = window.prompt('Reason for report (optional):') || 'No reason given';
    await reportUser(userId, reason);
    setReportSubmitted(true);
    setCurrentIndex((i) => Math.min(i + 1, profiles.length - 1));
    setTimeout(() => setReportSubmitted(false), 3000);
  }

  const currentProfile = profiles[currentIndex];

  useEffect(() => {
    async function trackView() {
      const p = profiles[currentIndex];
      if (!p?.id) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      if (p.id === user.id) return;
      await supabase.from('profile_views').insert({ viewer_id: user.id, viewed_id: p.id });
    }
    trackView();
  }, [currentIndex, profiles, supabase]);

  async function handleRefresh() {
    setLoadError(null);
    setLoading(true);
    setRetryCount((r) => r + 1);
    await new Promise((r) => setTimeout(r, 1500));
  }

  useEffect(() => {
    if (matchModal && matchModalPrimaryRef.current) {
      matchModalPrimaryRef.current.focus();
    }
  }, [matchModal]);

  function trapFocus(e: React.KeyboardEvent<HTMLDivElement>, container: HTMLDivElement | null) {
    if (e.key !== 'Tab' || !container) return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('aria-hidden'));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="flex min-h-screen flex-col bg-[var(--background)] pb-20">
      {matchModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in"
          role="dialog"
          aria-labelledby="match-title"
          onKeyDown={(e) => trapFocus(e, matchModalRef.current)}
        >
          <div
            ref={matchModalRef}
            className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-6 text-center shadow-snap-lg animate-match-pop"
          >
            <div className="flex justify-center gap-3">
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-[#fffc00]">
                {matchModal.avatarUrl ? (
                  <Image src={matchModal.avatarUrl} alt="" fill className="object-cover" sizes="64px" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#fffc00]">{matchModal.name.charAt(0)}</span>
                )}
              </div>
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-zinc-200 ring-2 ring-[#fffc00] flex items-center justify-center text-2xl animate-heart-bounce">♥</div>
            </div>
            <p className="mt-3 text-4xl animate-heart-bounce" style={{ animationDelay: '0.1s' }} aria-hidden>🎉</p>
            <h2 id="match-title" className="mt-1 text-lg font-bold text-stone-900">{t('itsAMatch')}</h2>
            <p className="mt-1 text-sm text-stone-600">{t('matchDesc', { name: matchModal.name })}</p>
            <div className="mt-4 flex flex-col gap-2">
              <Link
                href={`/chat/${matchModal.matchId}`}
                ref={matchModalPrimaryRef}
                className="rounded-full bg-[#fffc00] py-3 text-sm font-bold text-black shadow-snap transition hover:bg-[#e6e300] active:scale-95"
              >
                {t('sendMessage')}
              </Link>
              <button
                type="button"
                onClick={() => {
                  setMatchModal(null);
                  previouslyFocusedRef.current?.focus();
                }}
                className="rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-zinc-50"
              >
                {t('keepSwiping')}
              </button>
            </div>
          </div>
        </div>
      )}
      {reportSubmitted && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm rounded-lg bg-zinc-800 px-3 py-2.5 text-center text-xs text-white shadow-lg animate-toast-in" role="status">
          {t('reportFeedback')}
        </div>
      )}
      {likeError && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm rounded-xl bg-zinc-800 px-4 py-3 text-center text-sm text-white shadow-lg animate-toast-in">
          {likeError}
          <button type="button" onClick={() => setLikeError(null)} className="ml-2 underline">{t('tryAgain')}</button>
        </div>
      )}
      {superLikeError && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm rounded-xl bg-amber-600 px-4 py-3 text-center text-sm text-white shadow-lg animate-toast-in">
          {superLikeError}
          <button type="button" onClick={() => setSuperLikeError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}
      {locationPrompt === 'asking' && (
        <div className="border-b border-zinc-100 bg-[#fffc00]/10 px-3 py-2.5 text-center text-xs">
          <p className="font-medium text-black">{t('useLocationPrompt')}</p>
          <p className="mt-0.5 text-stone-600">{t('useLocationPromptDesc')}</p>
          <div className="mt-2 flex justify-center gap-2">
            <button type="button" onClick={handleAllowLocation} className="rounded-lg bg-[#fffc00] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#e6e300]">
              {t('allow')}
            </button>
            <button type="button" onClick={() => setLocationPrompt('denied')} className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
              {t('notNow')}
            </button>
          </div>
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-black/5 bg-white/95 px-3 py-2 backdrop-blur-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Link href="/" className="text-lg font-black text-black transition hover:opacity-80">
              {t('appName')}
            </Link>
            {isBoosted && (
              <span className="rounded-full bg-[#fffc00]/30 px-2 py-0.5 text-[10px] font-medium text-black" title={t('profileBoosted')}>
                ✨ {t('boosted')}
              </span>
            )}
            <button
              type="button"
              ref={filtersButtonRef}
              onClick={() => setFiltersOpen((o) => !o)}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100"
              title={t('filters')}
              aria-label={t('filters')}
            >
              ⚙
            </button>
            <LanguageSelector compact />
          </div>
          <nav className="flex items-center gap-2 text-xs sm:gap-3 sm:text-sm">
          <Link href="/matches" className="relative text-stone-600 hover:text-black">
            {t('matches')}
            {navUnread > 0 && (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-xs text-white">
                {navUnread > 99 ? '99+' : navUnread}
              </span>
            )}
          </Link>
          <Link href="/confessions" className="text-stone-600 hover:text-black">{t('confessions')}</Link>
          <Link href="/who-liked" className="text-stone-600 hover:text-black">{t('likes')}</Link>
          <Link href="/profile" className="text-stone-600 hover:text-black">{t('profile')}</Link>
          <Link href="/settings" className="text-stone-600 hover:text-black">{t('settings')}</Link>
          </nav>
        </div>
        {filtersOpen && (
          <>
            <button
              type="button"
              className="fixed inset-0 z-10 animate-fade-in"
              onClick={() => {
                setFiltersOpen(false);
                filtersButtonRef.current?.focus();
              }}
              aria-label={t('close')}
            />
            <div
              className="absolute left-3 right-3 top-full z-20 mt-1 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg animate-fade-in-up"
              onKeyDown={(e) => trapFocus(e, e.currentTarget)}
            >
              <p className="mb-1.5 text-xs font-medium text-stone-700">{t('ageRange')}</p>
              <div className="mb-3 flex items-center gap-2">
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={ageMin}
                  onChange={(e) => setAgeMin(Math.max(18, Math.min(99, parseInt(e.target.value, 10) || 18)))}
                  className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                  ref={filtersFirstInputRef}
                />
                <span className="text-zinc-400">–</span>
                <input
                  type="number"
                  min={18}
                  max={99}
                  value={ageMax}
                  onChange={(e) => setAgeMax(Math.max(18, Math.min(99, parseInt(e.target.value, 10) || 99)))}
                  className="w-20 rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                />
              </div>
              <p className="mb-1.5 text-xs font-medium text-stone-700">{t('distance')}</p>
              <select
                value={maxDistanceKm ?? ''}
                onChange={(e) => setMaxDistanceKm(e.target.value === '' ? null : parseInt(e.target.value, 10))}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {DISTANCE_OPTIONS.map((opt) => (
                  <option key={opt.value ?? 'any'} value={opt.value ?? ''}>{opt.label}</option>
                ))}
              </select>

              <p className="mt-3 mb-1.5 text-xs font-medium text-stone-700">{t('relationshipGoal')}</p>
              <select
                value={goalFilter}
                onChange={(e) => setGoalFilter(e.target.value)}
                className="w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm"
              >
                {RELATIONSHIP_GOALS.map((g) => (
                  <option key={g.value || 'any'} value={g.value}>{g.label}</option>
                ))}
              </select>

              <p className="mt-3 mb-1.5 text-xs font-medium text-stone-700">{t('interests')}</p>
              <div className="flex flex-wrap gap-2">
                {INTERESTS.map((i) => {
                  const active = interestFilters.includes(i);
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setInterestFilters((prev) => active ? prev.filter((x) => x !== i) : [...prev, i])}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${active ? 'bg-[#fffc00] text-black font-medium' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'}`}
                    >
                      {i}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                ref={filtersDoneRef}
                onClick={() => {
                  setFiltersOpen(false);
                  filtersButtonRef.current?.focus();
                }}
                className="mt-2 text-xs text-rose-600 hover:underline"
              >
                {t('done')}
              </button>
            </div>
          </>
        )}
      </header>

      <main className="flex flex-1 flex-col items-center justify-center p-4">
        {loading ? (
          <PageSkeleton variant="cards" />
        ) : loadError ? (
          <ErrorState message={loadError} title={t('couldntLoad')} onRetry={() => { setLoadError(null); setLoading(true); setRetryCount((c) => c + 1); }} retryLabel={t('tryAgain')} />
        ) : !currentProfile ? (
          <EmptyState
            emoji="👋"
            title={t('noOneNew')}
            description={t('noOneNewDesc')}
            actionLabel={t('viewMatches')}
            actionHref="/matches"
          />
        ) : (
          <>
          {lastPassedIndex !== null && (
            <button
              type="button"
              onClick={handleUndoPass}
              className="mb-3 rounded-full border-2 border-zinc-300 bg-white/90 px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50"
            >
              ↩ {t('rewind')}
            </button>
          )}
          <div
            key={currentProfile.id}
            className={`w-full max-w-sm ${cardExit ? (cardExit === 'left' ? 'animate-card-exit-left' : 'animate-card-exit-right') : 'animate-fade-in-up'}`}
          >
            {profiles[currentIndex + 1]?.avatar_url && (
              <div className="absolute h-0 w-0 overflow-hidden opacity-0" aria-hidden>
                <Image src={profiles[currentIndex + 1].avatar_url!} alt="" width={400} height={533} />
              </div>
            )}
            <ProfileCard
              profile={currentProfile}
              distanceKm={(currentProfile as { distanceKm?: number }).distanceKm}
              priority={currentIndex === 0}
              onLike={handleLike}
              onPass={handlePass}
              onSuperLike={async () => {
    setSuperLikeError(null);
    setCardExit('right');
    const result = await likeUser(currentProfile.id, true);
    if (result?.limitReached && result.error) {
      setSuperLikeError(result.error);
      setCardExit(null);
      return;
    }
    if (result?.matched && result.matchId) {
      setMatchModal({ matchId: result.matchId, name: currentProfile.name, avatarUrl: currentProfile.avatar_url });
      playMatchSound();
    }
    setTimeout(() => {
      setCurrentIndex((i) => Math.min(i + 1, profiles.length - 1));
      setCardExit(null);
    }, 280);
  }}
              onBlock={handleBlock}
              onReport={handleReport}
            />
          </div>
          </>
        )}
      </main>
      <BottomNav unreadCount={navUnread} />
    </div>
    </PullToRefresh>
  );
}
