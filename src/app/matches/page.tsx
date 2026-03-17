'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { unmatch } from '@/app/actions/match';
import { EmptyState } from '@/components/EmptyState';
import { PageSkeleton } from '@/components/PageSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import Link from 'next/link';
import Image from 'next/image';
import { BottomNav } from '@/components/BottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import type { Profile } from '@/types/database';
import { useOnlineStatus } from '@/lib/useOnlineStatus';

interface MatchWithProfile {
  matchId: string;
  matchCreatedAt: string;
  profile: Profile;
  lastMessage?: string;
  unreadCount?: number;
}

export default function MatchesPage() {
  const { t } = useLanguage();
  const online = useOnlineStatus();
  const [matches, setMatches] = useState<MatchWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [unmatchingId, setUnmatchingId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const supabase = createClient();
  const navUnread = matches.reduce((s, m) => s + (m.unreadCount ?? 0), 0);
  const newMatchesCount = matches.filter((m) => !m.lastMessage).length;
  const MATCHES_PAGE_SIZE = 20;

  async function handleUnmatch(matchId: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm(t('unmatchConfirm'))) return;
    setUnmatchingId(matchId);
    await unmatch(matchId);
    setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
    setUnmatchingId(null);
  }

  async function loadMatches() {
    setLoadError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadError(t('somethingWentWrong'));
      setLoading(false);
      return;
    }

    try {
      const { data: matchesData, error } = await supabase
        .from('matches')
        .select('id, user_a_id, user_b_id, created_at')
        .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(MATCHES_PAGE_SIZE);

      if (error) throw error;

      if (!matchesData?.length) {
        setMatches([]);
        setHasMore(false);
        setLoading(false);
        return;
      }

      setHasMore(matchesData.length >= MATCHES_PAGE_SIZE);

      // Block enforcement (both directions)
      const { data: blockedRows } = await supabase
        .from('blocked_users')
        .select('blocker_id, blocked_id')
        .or(`blocker_id.eq.${user.id},blocked_id.eq.${user.id}`);
      const blockedSet = new Set(
        (blockedRows ?? []).flatMap((b: any) => {
          if (b.blocker_id === user.id) return [b.blocked_id];
          if (b.blocked_id === user.id) return [b.blocker_id];
          return [];
        })
      );

      const filteredMatches = (matchesData ?? []).filter((m) => {
        const other = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
        return !blockedSet.has(other);
      });

      const otherIds = filteredMatches.map((m) =>
        m.user_a_id === user.id ? m.user_b_id : m.user_a_id
      );

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .in('id', otherIds);

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));

      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('match_id, content, sender_id, created_at, read_at')
        .in('match_id', filteredMatches.map((m) => m.id))
        .order('created_at', { ascending: false });

      if (messagesError) throw messagesError;

      const lastByMatch = new Map<string, { content: string; sender_id: string; read_at: string | null }>();
      const unreadByMatch = new Map<string, number>();
      (messages ?? []).forEach((msg) => {
        if (!lastByMatch.has(msg.match_id)) {
          lastByMatch.set(msg.match_id, {
            content: msg.content,
            sender_id: msg.sender_id,
            read_at: msg.read_at,
          });
        }
        if (msg.sender_id !== user.id && !msg.read_at) {
          unreadByMatch.set(msg.match_id, (unreadByMatch.get(msg.match_id) ?? 0) + 1);
        }
      });

      const result: MatchWithProfile[] = filteredMatches.map((m) => {
        const otherId = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
        const profile = profileMap.get(otherId);
        if (!profile) return null;
        const last = lastByMatch.get(m.id);
        return {
          matchId: m.id,
          matchCreatedAt: m.created_at,
          profile: profile as Profile,
          lastMessage: last?.content,
          unreadCount: unreadByMatch.get(m.id) ?? 0,
        };
      }).filter(Boolean) as MatchWithProfile[];

      setMatches(result);
    } catch (err: any) {
      setLoadError(err?.message || t('somethingWentWrong'));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadMatches();
  }, [supabase, refreshKey]);

  async function loadMore() {
    if (loadingMore || !hasMore || matches.length === 0) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setLoadingMore(true);
    const lastCreated = matches[matches.length - 1]?.matchCreatedAt ?? new Date().toISOString();
    const { data: matchesData } = await supabase
      .from('matches')
      .select('id, user_a_id, user_b_id, created_at')
      .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .lt('created_at', lastCreated)
      .order('created_at', { ascending: false })
      .limit(MATCHES_PAGE_SIZE);

    if (!matchesData?.length) {
      setHasMore(false);
      setLoadingMore(false);
      return;
    }

    const otherIds = matchesData.map((m) =>
      m.user_a_id === user.id ? m.user_b_id : m.user_a_id
    );
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', otherIds);
    const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
    const { data: messages } = await supabase
      .from('messages')
      .select('match_id, content, sender_id, read_at')
      .in('match_id', matchesData.map((m) => m.id))
      .order('created_at', { ascending: false });

    const lastByMatch = new Map<string, { content: string; sender_id: string; read_at: string | null }>();
    const unreadByMatch = new Map<string, number>();
    (messages ?? []).forEach((msg) => {
      if (!lastByMatch.has(msg.match_id)) lastByMatch.set(msg.match_id, { content: msg.content, sender_id: msg.sender_id, read_at: msg.read_at });
      if (msg.sender_id !== user.id && !msg.read_at) unreadByMatch.set(msg.match_id, (unreadByMatch.get(msg.match_id) ?? 0) + 1);
    });

    const more: MatchWithProfile[] = matchesData.map((m) => {
      const otherId = m.user_a_id === user.id ? m.user_b_id : m.user_a_id;
      const profile = profileMap.get(otherId);
      if (!profile) return null;
      const last = lastByMatch.get(m.id);
      return { matchId: m.id, matchCreatedAt: m.created_at, profile: profile as Profile, lastMessage: last?.content, unreadCount: unreadByMatch.get(m.id) ?? 0 };
    }).filter(Boolean) as MatchWithProfile[];

    setMatches((prev) => [...prev, ...more]);
    setHasMore(more.length >= MATCHES_PAGE_SIZE);
    setLoadingMore(false);
  }

  async function handleRefresh() {
    setLoading(true);
    setLoadError(null);
    setRefreshKey((k) => k + 1);
    await new Promise((r) => setTimeout(r, 1500));
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-[var(--background)] pb-20">
      {!online && (
        <div className="sticky top-0 z-20 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <span className="font-semibold">{t('offline')}.</span> {t('offlineDesc')}
        </div>
      )}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-sm">
        <h1 className="text-base font-bold text-black">{t('matches')}</h1>
        <LanguageSelector compact />
      </header>
      <main className="p-3 sm:p-4">
        {!loading && matches.length > 0 && newMatchesCount > 0 && (
          <Link
            href={`/chat/${matches.find((m) => !m.lastMessage)?.matchId ?? ''}`}
            className="mb-3 flex items-center justify-between rounded-xl border border-[#fffc00]/50 bg-[#fffc00]/15 px-4 py-3 text-left shadow-sm animate-fade-in-up"
          >
            <span className="text-sm font-medium text-zinc-900">
              {newMatchesCount === 1 ? t('matchReminderOne') : t('matchReminder', { count: String(newMatchesCount), plural: newMatchesCount === 1 ? '' : 'es' })}
            </span>
            <span className="text-xs text-zinc-600">→</span>
          </Link>
        )}
        {loading ? (
          <PageSkeleton variant="list" />
        ) : loadError ? (
          <ErrorState
            title={t('couldntLoad')}
            message={loadError}
            onRetry={loadMatches}
            retryLabel={t('tryAgain')}
          />
        ) : matches.length === 0 ? (
          <EmptyState
            emoji="💬"
            illustration="noMatches"
            title={t('noMatchesYet')}
            description={t('noMatchesDesc')}
            actionLabel={t('goToDiscovery')}
            actionHref="/discovery"
          />
        ) : (
          <>
          <ul className="stagger-children space-y-2">
            {matches.map(({ matchId, profile, lastMessage, unreadCount }) => (
              <li
                key={matchId}
                className="stagger-item group relative"
                style={{ contentVisibility: 'auto', containIntrinsicSize: '72px' } as any}
              >
                <Link
                  href={`/chat/${matchId}`}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 shadow-sm transition hover:bg-[#fffc00]/10"
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-zinc-200">
                    {profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-[#fffc00]/40 text-xl font-bold text-white">
                        {profile.name.charAt(0)}
                      </div>
                    )}
                    {(unreadCount ?? 0) > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#fffc00] text-xs font-bold text-black">
                        {unreadCount ?? 0}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-zinc-900">{profile.name}</p>
                    {lastMessage && (
                      <p className="truncate text-sm text-zinc-500">{lastMessage}</p>
                    )}
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={(e) => handleUnmatch(matchId, e)}
                  disabled={unmatchingId === matchId}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg px-3 py-1.5 text-sm text-zinc-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                  title="Unmatch"
                >
                  {unmatchingId === matchId ? '…' : t('unmatch')}
                </button>
              </li>
            ))}
          </ul>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {loadingMore ? t('loading') : t('loadMore')}
              </button>
            </div>
          )}
          </>
        )}
      </main>
      <BottomNav unreadCount={navUnread} />
    </div>
    </PullToRefresh>
  );
}
