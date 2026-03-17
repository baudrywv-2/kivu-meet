'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { postConfession, likeConfession, unlikeConfession, commentConfession } from '@/app/actions/confessions';
import { reportConfession } from '@/app/actions/safety';
import { EmptyState } from '@/components/EmptyState';
import { PageSkeleton } from '@/components/PageSkeleton';
import { BottomNav } from '@/components/BottomNav';
import { PullToRefresh } from '@/components/PullToRefresh';
import { ErrorState } from '@/components/ErrorState';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Confession } from '@/types/database';
import Link from 'next/link';

interface ConfessionComment {
  id: string;
  confession_id: string;
  content: string;
  is_anonymous: boolean;
  created_at: string;
}

export default function ConfessionsPage() {
  const { t } = useLanguage();
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [myCity, setMyCity] = useState<string>('');
  const [newContent, setNewContent] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [commentsByConfession, setCommentsByConfession] = useState<Record<string, ConfessionComment[]>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [postError, setPostError] = useState<string | null>(null);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const supabase = createClient();

  async function loadConfessions() {
    setLoadError(null);
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    try {
      const { data: profile } = await supabase.from('profiles').select('city').eq('id', user.id).single();
      setMyCity(profile?.city ?? 'Goma');
      const { data: confs } = await supabase
        .from('confessions')
        .select('*')
        .eq('city', profile?.city ?? 'Goma')
        .eq('is_removed', false)
        .order('created_at', { ascending: false })
        .limit(50);
      setConfessions(confs ?? []);
      const { data: myLikes } = await supabase.from('confession_likes').select('confession_id').eq('user_id', user.id);
      setLikedIds(new Set((myLikes ?? []).map((l) => l.confession_id)));
    } catch {
      setLoadError('Could not load confessions.');
    }
    setLoading(false);
  }

  useEffect(() => {
    loadConfessions();
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel('confessions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'confessions' },
        (payload) => {
          const c = payload.new as Confession;
          if (c.city === myCity && !c.is_removed) {
            setConfessions((prev) => [c, ...prev]);
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'confessions' },
        (payload) => {
          const c = payload.new as Confession;
          setConfessions((prev) =>
            prev.map((x) => (x.id === c.id ? c : x))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, myCity]);

  async function handlePost(e: React.FormEvent) {
    e.preventDefault();
    if (!newContent.trim() || !myCity) return;
    setPostError(null);
    const result = await postConfession(myCity, newContent);
    if (result?.error) {
      setPostError(result.error);
      return;
    }
    setNewContent('');
    setShowForm(false);
  }

  async function toggleLike(id: string) {
    const isLiked = likedIds.has(id);
    if (isLiked) {
      await unlikeConfession(id);
      setLikedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } else {
      await likeConfession(id);
      setLikedIds((prev) => new Set([...prev, id]));
    }
    setConfessions((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, likes_count: c.likes_count + (isLiked ? -1 : 1) }
          : c
      )
    );
  }

  async function loadComments(confessionId: string) {
    const { data } = await supabase
      .from('confession_comments')
      .select('id, confession_id, content, is_anonymous, created_at')
      .eq('confession_id', confessionId)
      .order('created_at', { ascending: true });
    setCommentsByConfession((prev) => ({ ...prev, [confessionId]: (data ?? []) as ConfessionComment[] }));
  }

  function toggleComments(confessionId: string) {
    if (expandedId === confessionId) {
      setExpandedId(null);
    } else {
      setExpandedId(confessionId);
      if (!commentsByConfession[confessionId]) loadComments(confessionId);
    }
  }

  async function handleAddComment(confessionId: string) {
    const content = commentInputs[confessionId]?.trim();
    if (!content) return;
    setSubmittingComment(confessionId);
    await commentConfession(confessionId, content, true);
    setCommentInputs((prev) => ({ ...prev, [confessionId]: '' }));
    await loadComments(confessionId);
    setConfessions((prev) =>
      prev.map((c) => (c.id === confessionId ? { ...c, comments_count: c.comments_count + 1 } : c))
    );
    setSubmittingComment(null);
  }

  async function handleRefresh() {
    await loadConfessions();
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
    <div className="min-h-screen bg-zinc-50 pb-20">
      {reportSubmitted && (
        <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-sm rounded-lg bg-zinc-800 px-3 py-2.5 text-center text-xs text-white shadow-lg animate-toast-in">
          {t('reportFeedback')}
        </div>
      )}
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-rose-600">{t('confessions')}</h1>
          <Link href="/discovery" className="text-zinc-600 hover:text-rose-600">
            {t('discovery')}
          </Link>
        </div>
        <p className="text-sm text-zinc-500">{myCity}</p>
      </header>

      <main className="p-4">
        <button
          onClick={() => setShowForm(!showForm)}
          className="mb-4 w-full rounded-xl bg-rose-500 py-3 font-medium text-white transition hover:bg-rose-600"
        >
          {showForm ? 'Cancel' : 'Post a confession'}
        </button>

        {showForm && (
          <form onSubmit={handlePost} className="mb-6 rounded-xl bg-white p-4 shadow">
            {postError && <p className="mb-2 text-sm text-red-600">{postError}</p>}
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Share anonymously... (max 1000 characters)"
              rows={4}
              maxLength={1000}
              required
              className="w-full rounded-lg border border-zinc-200 px-4 py-3 focus:border-rose-400 focus:outline-none"
            />
            <button
              type="submit"
              className="mt-2 w-full rounded-lg bg-rose-500 py-2 text-white hover:bg-rose-600"
            >
              Post
            </button>
          </form>
        )}

        {loading ? (
          <PageSkeleton variant="centered" />
        ) : loadError ? (
          <ErrorState message={loadError} onRetry={() => { setLoading(true); loadConfessions(); }} />
        ) : confessions.length === 0 ? (
          <EmptyState
            emoji="🫢"
            illustration="noConfessions"
            title={t('noConfessionsTitle')}
            description={t('noConfessionsDesc')}
            actionLabel="Post the first confession"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <ul className="space-y-4">
            {confessions.map((c) => (
              <li key={c.id} className="rounded-xl bg-white p-4 shadow-sm">
                <p className="text-zinc-800">{c.content}</p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-zinc-500">
                  <button
                    onClick={() => toggleLike(c.id)}
                    className={`flex items-center gap-1 ${likedIds.has(c.id) ? 'text-rose-500' : ''}`}
                  >
                    ♥ {c.likes_count}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleComments(c.id)}
                    className="hover:text-rose-600"
                  >
                    {c.comments_count} comment{c.comments_count !== 1 ? 's' : ''}
                  </button>
                  <span>{new Date(c.created_at).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={async () => {
                      const reason = window.prompt('Reason for reporting this confession (optional):') ?? 'No reason given';
                      await reportConfession(c.id, reason);
                      setReportSubmitted(true);
                      setTimeout(() => setReportSubmitted(false), 3000);
                    }}
                    className="ml-auto text-zinc-400 hover:text-red-600"
                    title="Report"
                  >
                    Report
                  </button>
                </div>

                {expandedId === c.id && (
                  <div className="mt-4 border-t border-zinc-100 pt-4">
                    <div className="mb-3 max-h-48 space-y-2 overflow-y-auto">
                      {(commentsByConfession[c.id] ?? []).length === 0 ? (
                        <p className="text-sm text-zinc-400">No comments yet. Be the first!</p>
                      ) : (
                        (commentsByConfession[c.id] ?? []).map((com) => (
                          <div key={com.id} className="rounded-lg bg-zinc-50 p-2 text-sm">
                            <p className="text-zinc-800">{com.content}</p>
                            <p className="mt-0.5 text-xs text-zinc-400">
                              {com.is_anonymous ? 'Anonymous' : 'Someone'} · {new Date(com.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={commentInputs[c.id] ?? ''}
                        onChange={(e) => setCommentInputs((prev) => ({ ...prev, [c.id]: e.target.value }))}
                        placeholder="Add a comment (max 500 chars)"
                        maxLength={500}
                        className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm focus:border-rose-400 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleAddComment(c.id)}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddComment(c.id)}
                        disabled={submittingComment === c.id || !(commentInputs[c.id]?.trim())}
                        className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-medium text-white hover:bg-rose-600 disabled:opacity-50"
                      >
                        {submittingComment === c.id ? '...' : 'Post'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
      <BottomNav />
    </div>
    </PullToRefresh>
  );
}
