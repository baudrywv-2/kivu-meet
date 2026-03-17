'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { sendMessage, markMessagesRead, sendMessageWithClientId, upsertMessageReceipt, toggleReaction, deleteMessageForMe, deleteMessageForEveryone } from '@/app/actions/chat';
import { blockUser, reportUser, reportMessage } from '@/app/actions/safety';
import { unmatch } from '@/app/actions/match';
import { uploadChatVoice, uploadChatImage } from '@/app/actions/upload';
import { getSignedUrlForRef } from '@/app/actions/media';
import { PageSkeleton } from '@/components/PageSkeleton';
import { ErrorState } from '@/components/ErrorState';
import { EmptyState } from '@/components/EmptyState';
import { useLanguage } from '@/contexts/LanguageContext';
import { playMessageSound } from '@/lib/sound';
import Link from 'next/link';
import Image from 'next/image';
import type { Message } from '@/types/database';
import type { Profile } from '@/types/database';
import { isStorageRef } from '@/lib/storageRef';
import { putOutboxBlob, getOutboxBlob, deleteOutboxBlob } from '@/lib/outboxBlobs';
import { getChatCache, putChatCache } from '@/lib/chatCache';
import { useOnlineStatus } from '@/lib/useOnlineStatus';
import { compressImageFile } from '@/lib/imageCompression';

const VOICE_PREFIX = '[voice]';
const IMAGE_PREFIX = '[image]';

function extractReplyId(content: string): { replyToId: string | null; rest: string } {
  if (!content.startsWith('[reply:')) return { replyToId: null, rest: content };
  const end = content.indexOf(']');
  if (end === -1) return { replyToId: null, rest: content };
  const id = content.slice('[reply:'.length, end).trim();
  const rest = content.slice(end + 1).trimStart();
  return { replyToId: id || null, rest };
}

function parseMessageContent(content: string): { type: 'text' | 'voice' | 'image'; value: string; replyToId: string | null } {
  const { replyToId, rest } = extractReplyId(content);
  if (rest.startsWith(VOICE_PREFIX)) return { type: 'voice', value: rest.slice(VOICE_PREFIX.length).trim(), replyToId };
  if (rest.startsWith(IMAGE_PREFIX)) return { type: 'image', value: rest.slice(IMAGE_PREFIX.length).trim(), replyToId };
  return { type: 'text', value: rest, replyToId };
}

export default function ChatPage() {
  const params = useParams();
  const matchId = params.matchId as string;
  type OutboxKind = 'text' | 'voice' | 'image';
  type MessageWithFlags = Message & { _pending?: boolean; _queued?: boolean; _failed?: boolean; _tempContent?: string; _clientId?: string; _outboxKind?: OutboxKind };
  const [messages, setMessages] = useState<MessageWithFlags[]>([]);
  const [otherProfile, setOtherProfile] = useState<Profile | null>(null);
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const typingChannelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [uploadingVoice, setUploadingVoice] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [signedUrlCache, setSignedUrlCache] = useState<Record<string, string>>({});
  const [reactionsByMessage, setReactionsByMessage] = useState<Record<string, { emoji: string; count: number; mine: boolean }[]>>({});
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const { t } = useLanguage();
  const CHAT_PAGE_SIZE = 50;
  const [loadError, setLoadError] = useState<string | null>(null);
  const outboxKey = `kivu:outbox:${matchId}`;
  const OUTBOX_TTL_DAYS = 7;
  const online = useOnlineStatus();

  function makeClientId() {
    // short, unique enough for local + DB dedupe
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function loadOutbox(): { clientId: string; kind: OutboxKind; content: string; created_at: string; mime?: string; name?: string }[] {
    try {
      const raw = localStorage.getItem(outboxKey);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((x) => ({
          clientId: String(x.clientId ?? ''),
          kind: (x.kind === 'voice' || x.kind === 'image' || x.kind === 'text') ? x.kind : 'text',
          content: String(x.content ?? ''),
          created_at: String(x.created_at ?? new Date().toISOString()),
          mime: x.mime ? String(x.mime) : undefined,
          name: x.name ? String(x.name) : undefined,
        }))
        .filter((x) => x.clientId && x.content);
    } catch {
      return [];
    }
  }

  function saveOutbox(items: { clientId: string; kind: OutboxKind; content: string; created_at: string; mime?: string; name?: string }[]) {
    try {
      localStorage.setItem(outboxKey, JSON.stringify(items.slice(-200)));
    } catch {
      // ignore quota errors
    }
  }

  function enqueueOutbox(item: { clientId: string; kind: OutboxKind; content: string; created_at: string; mime?: string; name?: string }) {
    const items = loadOutbox();
    if (items.some((i) => i.clientId === item.clientId)) return;
    items.push(item);
    saveOutbox(items);
  }

  function dequeueOutbox(clientId: string) {
    const items = loadOutbox().filter((i) => i.clientId !== clientId);
    saveOutbox(items);
  }

  async function cleanupOutbox() {
    const cutoff = Date.now() - OUTBOX_TTL_DAYS * 24 * 60 * 60 * 1000;
    const items = loadOutbox();
    const keep: typeof items = [];
    for (const it of items) {
      const ts = Date.parse(it.created_at || '') || 0;
      if (ts && ts < cutoff) {
        if (it.kind !== 'text') {
          try { await deleteOutboxBlob(it.clientId); } catch {}
        }
        continue;
      }
      keep.push(it);
    }
    if (keep.length !== items.length) saveOutbox(keep);
  }

  async function sendOutboxItem(item: ReturnType<typeof loadOutbox>[number]) {
    let contentToSend = item.content;
    if (item.kind === 'voice') {
      const blob = await getOutboxBlob(item.clientId);
      if (!blob) {
        dequeueOutbox(item.clientId);
        return { ok: true as const };
      }
      const file = new File([blob], item.name ?? 'voice.webm', { type: item.mime ?? blob.type ?? 'audio/webm' });
      const fd = new FormData();
      fd.set('file', file);
      const up = await uploadChatVoice(fd);
      if (up?.error || !up.ref) return { ok: false as const, error: up?.error ?? 'Upload failed' };
      contentToSend = `${VOICE_PREFIX}${up.ref}`;
    }
    if (item.kind === 'image') {
      const blob = await getOutboxBlob(item.clientId);
      if (!blob) {
        dequeueOutbox(item.clientId);
        return { ok: true as const };
      }
      const file = new File([blob], item.name ?? 'image.jpg', { type: item.mime ?? blob.type ?? 'image/jpeg' });
      const fd = new FormData();
      fd.set('file', file);
      const up = await uploadChatImage(fd);
      if (up?.error || !up.ref) return { ok: false as const, error: up?.error ?? 'Upload failed' };
      contentToSend = `${IMAGE_PREFIX}${up.ref}`;
    }

    const res = await sendMessageWithClientId(matchId, contentToSend, item.clientId);
    if (res?.error) return { ok: false as const, error: res.error };

    dequeueOutbox(item.clientId);
    if (item.kind !== 'text') await deleteOutboxBlob(item.clientId);
    return { ok: true as const };
  }

  async function flushOutbox() {
    if (!currentUserIdRef.current) return;
    if (!online) return;

    await cleanupOutbox();
    const items = loadOutbox();
    if (!items.length) return;

    // Mark queued items as pending in UI
    setMessages((prev) =>
      prev.map((m) => (m._queued && m._clientId && items.some((i) => i.clientId === m._clientId))
        ? { ...m, _queued: false, _pending: true, _failed: false }
        : m
      )
    );

    for (const item of items) {
      const res = await sendOutboxItem(item);
      if (!res.ok) {
        setMessages((prev) =>
          prev.map((m) => (m._clientId === item.clientId ? { ...m, _pending: false, _failed: true } : m))
        );
        return;
      }
    }
  }

  async function load() {
    setLoadError(null);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoadError(t('somethingWentWrong'));
      setLoading(false);
      return;
    }

    try {
      const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('user_a_id, user_b_id')
        .eq('id', matchId)
        .single();

      if (matchError) throw matchError;
      if (!match) {
        setLoadError(t('somethingWentWrong'));
        setLoading(false);
        return;
      }

      const otherId = match.user_a_id === user.id ? match.user_b_id : match.user_a_id;

      // Block enforcement (both directions): if either blocked, deny chat
      const { data: blocked } = await supabase
        .from('blocked_users')
        .select('blocker_id')
        .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherId}),and(blocker_id.eq.${otherId},blocked_id.eq.${user.id})`)
        .maybeSingle();
      if (blocked) {
        setLoadError('Chat unavailable.');
        setLoading(false);
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', otherId)
        .single();

      if (profileError) throw profileError;

      setOtherProfile(profile as Profile);

      const { data: msgs, error: msgsError } = await supabase
        .from('messages')
        .select('*')
        .eq('match_id', matchId)
        .order('created_at', { ascending: false })
        .limit(CHAT_PAGE_SIZE);

      if (msgsError) throw msgsError;

      const { data: hidden } = await supabase
        .from('message_hidden')
        .select('message_id')
        .eq('user_id', user.id)
        .in('message_id', (msgs ?? []).map((m: any) => m.id));
      const hiddenSet = new Set((hidden ?? []).map((h: any) => h.message_id));
      setHiddenIds(hiddenSet);
      const visible = (((msgs ?? []) as any[]).filter((m) => !hiddenSet.has(m.id)) as MessageWithFlags[]);
      setMessages(visible.reverse());
      setHasMore((msgs?.length ?? 0) >= CHAT_PAGE_SIZE);
      try {
        await putChatCache(matchId, (msgs ?? []).slice(0, CHAT_PAGE_SIZE));
      } catch {
        // ignore caching errors
      }
      // Load reactions for visible messages (best-effort)
      try {
        const ids = visible.map((m) => m.id);
        if (ids.length) {
          const { data: reacts } = await supabase
            .from('message_reactions')
            .select('message_id, user_id, emoji')
            .in('message_id', ids);
          const map: Record<string, Record<string, { count: number; mine: boolean }>> = {};
          for (const r of (reacts ?? []) as any[]) {
            const mid = String(r.message_id);
            const emoji = String(r.emoji);
            const uid = String(r.user_id);
            map[mid] ||= {};
            map[mid][emoji] ||= { count: 0, mine: false };
            map[mid][emoji].count += 1;
            if (uid === user.id) map[mid][emoji].mine = true;
          }
          const next: Record<string, { emoji: string; count: number; mine: boolean }[]> = {};
          for (const [mid, em] of Object.entries(map)) {
            next[mid] = Object.entries(em)
              .map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
              .sort((a, b) => b.count - a.count);
          }
          setReactionsByMessage(next);
        }
      } catch {
        // optional
      }

      // Write delivered/read receipts for messages we can see (best-effort)
      try {
        const fromOther = visible.filter((m) => m.sender_id !== user.id).slice(0, 50);
        await Promise.all(fromOther.map((m) => upsertMessageReceipt({ messageId: m.id, delivered: true, read: true })));
      } catch {
        // optional
      }
      await markMessagesRead(matchId);
    } catch (err: any) {
      const msg = String(err?.message ?? '').toLowerCase();
      const looksOffline = (typeof navigator !== 'undefined' && navigator.onLine === false) || msg.includes('fetch') || msg.includes('network');
      if (looksOffline) {
        const cached = await getChatCache<any[]>(matchId);
        if (cached?.length) {
          setMessages(((cached ?? []) as MessageWithFlags[]).reverse());
          setHasMore(false);
          setLoadError(null);
        } else {
          setLoadError(t('loadError'));
        }
      } else {
        setLoadError(err?.message || t('somethingWentWrong'));
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [matchId, supabase]);

  useEffect(() => {
    // Load queued messages into UI (client-only)
    const queued = loadOutbox();
    setOutboxCount(queued.length);
    if (!queued.length) return;
    setMessages((prev) => {
      const existingClientIds = new Set(prev.map((m) => m._clientId).filter(Boolean) as string[]);
      const nextQueued: MessageWithFlags[] = queued
        .filter((q) => !existingClientIds.has(q.clientId))
        .map((q) => ({
          id: `queued-${q.clientId}`,
          match_id: matchId,
          sender_id: currentUserIdRef.current ?? 'me',
          content: q.kind === 'text' ? q.content : (q.kind === 'voice' ? '🎤 Voice message' : '🖼 Photo'),
          read_at: null,
          created_at: q.created_at,
          client_message_id: q.clientId,
          _queued: true,
          _tempContent: q.content,
          _clientId: q.clientId,
          _outboxKind: q.kind,
        }));
      return [...prev, ...nextQueued];
    });
  }, [matchId]);

  useEffect(() => {
    // Keep outbox count updated (outbox can change from other tabs or online flush)
    setOutboxCount(loadOutbox().length);
    const id = window.setInterval(() => setOutboxCount(loadOutbox().length), 1500);
    return () => window.clearInterval(id);
  }, [matchId]);

  useEffect(() => {
    cleanupOutbox();
  }, [matchId]);

  useEffect(() => {
    if (online) flushOutbox();
  }, [online, matchId]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${matchId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const next = payload.new as MessageWithFlags;
          const fromOther = currentUserIdRef.current && next.sender_id !== currentUserIdRef.current;
          if (fromOther) playMessageSound();
          setMessages((prev) => {
            if (hiddenIds.has(next.id)) return prev;
            const fromSelf = currentUserIdRef.current && next.sender_id === currentUserIdRef.current;
            const clientId = (next as any).client_message_id as string | undefined;
            const pendingByClient = clientId ? prev.find((m) => m._clientId === clientId) : undefined;
            const pending = pendingByClient ?? prev.find((m) => (m as MessageWithFlags)._pending);
            if (fromSelf && pending) {
              return [...prev.filter((m) => m !== pending), next];
            }
            return [...prev, next];
          });

          // Mark delivered (best-effort) for messages from other user
          if (fromOther && next.id) {
            upsertMessageReceipt({ messageId: next.id, delivered: true });
            // If this chat is open, also mark as read quickly
            upsertMessageReceipt({ messageId: next.id, read: true });
            markMessagesRead(matchId);
          }

          const cid = (next as any).client_message_id as string | undefined;
          if (cid) dequeueOutbox(cid);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `match_id=eq.${matchId}` },
        (payload) => {
          const updated = payload.new as any;
          if (!updated?.id) return;
          setMessages((prev) => prev.map((m) => (m.id === updated.id ? { ...m, ...(updated as any) } : m)));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase, hiddenIds]);

  useEffect(() => {
    // Keep reactions in sync for messages in this chat (best-effort)
    const channel = supabase
      .channel(`reactions:${matchId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        async (payload) => {
          const row = (payload.new ?? payload.old) as any;
          const messageId = row?.message_id as string | undefined;
          if (!messageId) return;
          if (!messages.some((m) => m.id === messageId)) return;
          try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const { data: reacts } = await supabase
              .from('message_reactions')
              .select('message_id, user_id, emoji')
              .eq('message_id', messageId);
            const grouped: Record<string, { count: number; mine: boolean }> = {};
            for (const r of (reacts ?? []) as any[]) {
              const emoji = String(r.emoji);
              const uid = String(r.user_id);
              grouped[emoji] ||= { count: 0, mine: false };
              grouped[emoji].count += 1;
              if (uid === user.id) grouped[emoji].mine = true;
            }
            const arr = Object.entries(grouped)
              .map(([emoji, v]) => ({ emoji, count: v.count, mine: v.mine }))
              .sort((a, b) => b.count - a.count);
            setReactionsByMessage((prev) => ({ ...prev, [messageId]: arr }));
          } catch {
            // ignore
          }
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, supabase, messages]);

  useEffect(() => {
    if (!otherProfile || !currentUserIdRef.current) return;
    const channel = supabase.channel(`typing:${matchId}`)
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const uid = (payload as { userId?: string })?.userId;
        if (uid && uid !== currentUserIdRef.current) {
          setOtherTyping(true);
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = channel;
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      supabase.removeChannel(channel);
      typingChannelRef.current = null;
    };
  }, [matchId, supabase, otherProfile]);

  useEffect(() => {
    if (!content.trim() || !typingChannelRef.current) return;
    const id = setTimeout(() => {
      typingChannelRef.current?.send({ type: 'broadcast', event: 'typing', payload: { userId: currentUserIdRef.current } });
    }, 400);
    return () => clearTimeout(id);
  }, [content]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Persist latest chat history for offline viewing (exclude queued placeholders)
    if (!messages.length) return;
    const persist = async () => {
      const real = messages.filter((m) => !(m as MessageWithFlags)._queued).slice(-CHAT_PAGE_SIZE);
      try {
        await putChatCache(matchId, real);
      } catch {
        // ignore
      }
    };
    persist();
  }, [messages, matchId]);

  useEffect(() => {
    let cancelled = false;
    async function resolveRefs() {
      const refs = new Set<string>();
      for (const m of messages) {
        const parsed = parseMessageContent(m.content);
        if ((parsed.type === 'voice' || parsed.type === 'image') && isStorageRef(parsed.value) && !signedUrlCache[parsed.value]) {
          refs.add(parsed.value);
        }
      }
      if (!refs.size) return;
      const entries = await Promise.all(
        Array.from(refs).map(async (ref) => {
          const res = await getSignedUrlForRef(ref, { matchId });
          return [ref, res.url] as const;
        })
      );
      if (cancelled) return;
      setSignedUrlCache((prev) => {
        const next = { ...prev };
        for (const [ref, url] of entries) {
          if (url) next[ref] = url;
        }
        return next;
      });
    }
    resolveRefs();
    return () => {
      cancelled = true;
    };
  }, [messages, matchId, signedUrlCache]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = content.trim();
    if (!text || sending || !currentUserId) return;
    setSendError(null);
    setSending(true);
    const clientId = makeClientId();
    const tempId = `temp-${clientId}`;
    const composed = replyToId ? `[reply:${replyToId}] ${text}` : text;
    setReplyToId(null);

    const optimistic: MessageWithFlags = {
      id: tempId,
      match_id: matchId,
      sender_id: currentUserId,
      content: composed,
      read_at: null,
      created_at: new Date().toISOString(),
      _pending: typeof navigator === 'undefined' ? true : navigator.onLine !== false,
      _queued: typeof navigator !== 'undefined' && navigator.onLine === false,
      _tempContent: text,
      _clientId: clientId,
      client_message_id: clientId,
    };
    setMessages((prev) => [...prev, optimistic]);
    setContent('');

    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      enqueueOutbox({ clientId, kind: 'text', content: composed, created_at: optimistic.created_at });
      setSending(false);
      return;
    }

    const result = await sendMessageWithClientId(matchId, composed, clientId);
    setSending(false);
    if (result?.error) {
      // if likely network issue, queue it
      const msg = String(result.error).toLowerCase();
      const looksOffline = msg.includes('fetch') || msg.includes('network') || msg.includes('failed');
      if (looksOffline) {
        enqueueOutbox({ clientId, kind: 'text', content: text, created_at: optimistic.created_at });
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...(m as MessageWithFlags), _pending: false, _queued: true } : m))
        );
        return;
      }
      setSendError(result.error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...(m as MessageWithFlags), _pending: false, _failed: true } : m
        )
      );
    }
  }

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [outboxCount, setOutboxCount] = useState(0);
  const [outboxOpen, setOutboxOpen] = useState(false);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      currentUserIdRef.current = id;
      setCurrentUserId(id);
    });
  }, [supabase]);

  async function loadOlder() {
    if (loadingOlder || messages.length === 0 || !hasMore) return;
    const oldest = messages[0];
    if (!oldest || (oldest as MessageWithFlags)._pending) return;
    setLoadingOlder(true);
    const { data: older } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .lt('created_at', oldest.created_at)
      .order('created_at', { ascending: false })
      .limit(CHAT_PAGE_SIZE);
    setLoadingOlder(false);
    if (older?.length) {
      // Filter out hidden messages for this user in this page
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const uid = user?.id;
        if (uid) {
          const { data: hidden } = await supabase
            .from('message_hidden')
            .select('message_id')
            .eq('user_id', uid)
            .in('message_id', (older ?? []).map((m: any) => m.id));
          const pageHidden = new Set((hidden ?? []).map((h: any) => String(h.message_id)));
          setHiddenIds((prev) => new Set([...Array.from(prev), ...Array.from(pageHidden)]));
          const filtered = (older as any[]).filter((m) => !pageHidden.has(String(m.id)));
          setMessages((prev) => [...(filtered as MessageWithFlags[]).reverse(), ...prev]);
        } else {
          setMessages((prev) => [...(older as MessageWithFlags[] ?? []).reverse(), ...prev]);
        }
      } catch {
        setMessages((prev) => [...(older as MessageWithFlags[] ?? []).reverse(), ...prev]);
      }
      setHasMore(older.length >= CHAT_PAGE_SIZE);
    } else {
      setHasMore(false);
    }
  }

  async function handleBlock() {
    if (!otherProfile) return;
    await blockUser(otherProfile.id);
    window.location.href = '/matches';
  }

  async function handleReportUser() {
    if (!otherProfile) return;
    const reason = window.prompt('Reason for report (optional):') || 'No reason given';
    await reportUser(otherProfile.id, reason);
    setMenuOpen(false);
    setReportSubmitted(true);
    setTimeout(() => setReportSubmitted(false), 3000);
  }

  async function handleReportMessage() {
    const fromOther = messages.filter((m) => m.sender_id !== currentUserId);
    const lastFromOther = fromOther[fromOther.length - 1];
    if (!lastFromOther) {
      alert('No message to report.');
      return;
    }
    const reason = window.prompt('Reason for reporting this message (optional):') || 'No reason given';
    await reportMessage(lastFromOther.id, reason);
    setMenuOpen(false);
    setReportSubmitted(true);
    setTimeout(() => setReportSubmitted(false), 3000);
  }

  async function handleUnmatch() {
    if (!confirm('Unmatch? This will remove the conversation.')) return;
    await unmatch(matchId);
    window.location.href = '/matches';
  }

  if (loading) return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/matches" className="text-rose-600">← {t('back')}</Link>
      </header>
      <main className="flex flex-1 items-center justify-center p-4">
        <PageSkeleton variant="centered" />
      </main>
    </div>
  );

  if (loadError || !otherProfile) return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/matches" className="text-rose-600">← {t('back')}</Link>
      </header>
      <main className="p-4">
        <ErrorState message={loadError ?? t('somethingWentWrong')} onRetry={load} />
        <Link href="/matches" className="mt-4 inline-block text-rose-600 hover:underline">{t('back')}</Link>
      </main>
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      {!online && (
        <div className="sticky top-0 z-20 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
          <span className="font-semibold">{t('offline')}.</span> {t('offlineDesc')}
        </div>
      )}
      {reportSubmitted && (
        <div className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-sm rounded-lg bg-zinc-800 px-3 py-2.5 text-center text-xs text-white shadow-lg animate-toast-in">
          {t('reportFeedback')}
        </div>
      )}
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/matches" className="text-rose-600">←</Link>
        <Link href={otherProfile ? `/profile/${otherProfile.id}` : '/matches'} className="flex-1 min-w-0">
          <h1 className="font-bold truncate">{otherProfile?.name ?? 'Chat'}</h1>
          <p className="text-sm text-zinc-500 truncate">{otherProfile?.city}</p>
        </Link>
        {outboxCount > 0 && (
          <button
            type="button"
            onClick={() => setOutboxOpen(true)}
            className="hidden sm:inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
            title={t('queued')}
          >
            {t('queued')}: {outboxCount}
          </button>
        )}
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 hover:bg-zinc-100"
            aria-label={t('options')}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <div className="absolute right-0 top-10 z-20 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={handleReportUser}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Report user
                </button>
                {messages.some((m) => m.sender_id !== currentUserId) && (
                  <button
                    type="button"
                    onClick={handleReportMessage}
                    className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                  >
                    Report last message
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleUnmatch}
                  className="w-full px-4 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100"
                >
                  Unmatch
                </button>
                <button
                  type="button"
                  onClick={handleBlock}
                  className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Block
                </button>
              </div>
              <button
                type="button"
                className="fixed inset-0 z-10"
                onClick={() => setMenuOpen(false)}
                aria-label={t('close')}
              />
            </>
          )}
        </div>
      </header>

      {outboxOpen && (
        <div className="fixed inset-0 z-50">
          <button className="absolute inset-0 bg-black/30" onClick={() => setOutboxOpen(false)} aria-label={t('close')} />
          <div className="absolute bottom-0 left-0 right-0 mx-auto w-full max-w-lg rounded-t-2xl bg-white p-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900">{t('queuedMessages')}</h2>
              <button className="text-sm text-zinc-500 hover:text-zinc-800" onClick={() => setOutboxOpen(false)}>
                {t('close')}
              </button>
            </div>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-lg bg-[#fffc00] px-3 py-2 text-sm font-bold text-black hover:bg-[#e6e300]"
                onClick={() => flushOutbox()}
              >
                {t('retryAll')}
              </button>
              <button
                type="button"
                className="flex-1 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                onClick={async () => {
                  if (!confirm('Clear queued messages?')) return;
                  const items = loadOutbox();
                  for (const it of items) {
                    if (it.kind !== 'text') {
                      try { await deleteOutboxBlob(it.clientId); } catch {}
                    }
                  }
                  saveOutbox([]);
                  setOutboxCount(0);
                  setMessages((prev) => prev.filter((m) => !(m as MessageWithFlags)._queued));
                }}
              >
                {t('clearAll')}
              </button>
            </div>

            <div className="mt-3 max-h-[50vh] overflow-y-auto space-y-2">
              {loadOutbox().length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">{t('done')}</p>
              ) : (
                loadOutbox().slice().reverse().map((it) => (
                  <div key={it.clientId} className="rounded-xl border border-zinc-200 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900">
                          {it.kind === 'voice' ? t('queuedVoice') : it.kind === 'image' ? t('queuedPhoto') : t('queued')}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {it.kind === 'text' ? it.content : (it.name ?? '')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className="rounded-lg bg-zinc-100 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200"
                          onClick={async () => {
                            setMessages((prev) =>
                              prev.map((m) => (m._clientId === it.clientId ? { ...m, _queued: false, _pending: true, _failed: false } : m))
                            );
                            const res = await sendOutboxItem(it);
                            if (!res.ok) {
                              setMessages((prev) =>
                                prev.map((m) => (m._clientId === it.clientId ? { ...m, _pending: false, _failed: true } : m))
                              );
                            }
                            setOutboxCount(loadOutbox().length);
                          }}
                        >
                          {t('tryAgain')}
                        </button>
                        <button
                          type="button"
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                          onClick={async () => {
                            dequeueOutbox(it.clientId);
                            if (it.kind !== 'text') {
                              try { await deleteOutboxBlob(it.clientId); } catch {}
                            }
                            setOutboxCount(loadOutbox().length);
                            setMessages((prev) => prev.filter((m) => m._clientId !== it.clientId));
                          }}
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 flex-col overflow-y-auto p-4">
        {hasMore && (
          <div className="flex justify-center py-2">
            <button
              type="button"
              onClick={loadOlder}
              disabled={loadingOlder}
              className="text-sm text-zinc-500 hover:text-zinc-700 disabled:opacity-50"
            >
              {loadingOlder ? t('loading') : t('loadOlderMessages')}
            </button>
          </div>
        )}
        {otherTyping && (
          <p className="text-xs text-zinc-500 py-1">{t('isTyping', { name: otherProfile?.name ?? '' })}</p>
        )}
        {messages.length === 0 && !otherTyping && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <EmptyState
              emoji="👋"
              illustration="noMessages"
              title={t('noMessagesTitle')}
              description={t('noMessagesDesc')}
            />
          </div>
        )}
        <div className="space-y-2">
          {messages.map((msg) => {
            const parsed = parseMessageContent(msg.content);
            const isOwn = msg.sender_id === currentUserId;
            const mediaUrl =
              (parsed.type === 'voice' || parsed.type === 'image') && isStorageRef(parsed.value)
                ? signedUrlCache[parsed.value]
                : parsed.value;
            const replied = parsed.replyToId ? messages.find((m) => m.id === parsed.replyToId) : null;
            const repliedText = replied ? parseMessageContent(replied.content).value : null;
            return (
              <div
                key={msg.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                    isOwn ? 'bg-rose-500 text-white' : 'bg-white text-zinc-900 shadow'
                  } ${(msg as MessageWithFlags)._pending ? 'opacity-80' : ''} ${(msg as MessageWithFlags)._failed ? 'border border-red-500' : ''}`}
                  onClick={async () => {
                    const m = msg as MessageWithFlags;
                    if (!isOwn || !m._failed || !m._tempContent || sending) return;
                    setSendError(null);
                    setMessages((prev) =>
                      prev.map((mm) =>
                        mm.id === m.id ? { ...(mm as MessageWithFlags), _failed: false, _pending: true } : mm
                      )
                    );
                    const result = await sendMessage(matchId, m._tempContent);
                    if (result?.error) {
                      setSendError(result.error);
                      setMessages((prev) =>
                        prev.map((mm) =>
                          mm.id === m.id ? { ...(mm as MessageWithFlags), _failed: true, _pending: false } : mm
                        )
                      );
                    }
                  }}
                  onDoubleClick={() => {
                    setReplyToId(msg.id);
                  }}
                >
                  {parsed.replyToId && repliedText && (
                    <div className={`mb-1 rounded-lg px-2 py-1 text-[11px] ${isOwn ? 'bg-white/20' : 'bg-zinc-100'}`}>
                      ↩ {String(repliedText).slice(0, 60)}
                    </div>
                  )}
                  {parsed.type === 'voice' && (
                    <audio controls src={mediaUrl} className="max-w-full h-9" />
                  )}
                  {parsed.type === 'image' && (
                    <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className="block rounded-lg overflow-hidden">
                      <Image src={mediaUrl} alt="" width={240} height={240} className="max-h-48 w-auto object-cover" unoptimized />
                    </a>
                  )}
                  {((msg as any).deleted_at || String(parsed.value).trim() === '[deleted]') ? (
                    <span className="italic opacity-80">{t('messageDeleted') || 'Message deleted'}</span>
                  ) : (
                    parsed.type === 'text' && parsed.value
                  )}
                  {(msg as MessageWithFlags)._pending && (
                    <span className="ml-1 text-xs opacity-70">·</span>
                  )}
                  {isOwn && (msg as MessageWithFlags)._queued && (
                    <span className="ml-1 inline-block text-[10px] opacity-80">
                      ⏸ {(msg as MessageWithFlags)._outboxKind === 'voice' ? t('queuedVoice') : (msg as MessageWithFlags)._outboxKind === 'image' ? t('queuedPhoto') : t('queued')}
                    </span>
                  )}
                  {isOwn && (msg as MessageWithFlags)._failed && (
                    <div className="mt-1 text-[11px] opacity-80">
                      {t('messageSendFailed')} <span className="underline">{t('messageSendRetry')}</span>
                    </div>
                  )}
                  {isOwn && msg.read_at && (
                    <span className="ml-1 inline-block text-[10px] opacity-80 animate-message-tick">✓ {t('seen')}</span>
                  )}

                  {!!reactionsByMessage[msg.id]?.length && (
                    <div className={`mt-1 flex flex-wrap gap-1.5 ${isOwn ? 'justify-end' : 'justify-start'}`}>
                      {reactionsByMessage[msg.id].map((r) => (
                        <button
                          key={`${msg.id}:${r.emoji}`}
                          type="button"
                          className={`rounded-full border px-2 py-0.5 text-[11px] ${r.mine ? 'border-[#fffc00] bg-[#fffc00]/20' : 'border-black/10 bg-white/10'}`}
                          onClick={async (e) => {
                            e.stopPropagation();
                            await toggleReaction({ messageId: msg.id, emoji: r.emoji });
                          }}
                          title={r.mine ? 'You reacted' : 'React'}
                        >
                          {r.emoji} {r.count}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className={`mt-1 flex gap-3 text-[11px] ${isOwn ? 'text-white/80' : 'text-zinc-500'}`}>
                    <button
                      type="button"
                      className="underline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        const emoji = window.prompt('React with emoji (👍 ❤️ 😂):') || '';
                        if (!emoji) return;
                        await toggleReaction({ messageId: msg.id, emoji });
                      }}
                    >
                      React
                    </button>
                    <button
                      type="button"
                      className="underline"
                      onClick={async (e) => {
                        e.stopPropagation();
                        await deleteMessageForMe(msg.id);
                        setHiddenIds((prev) => new Set([...Array.from(prev), msg.id]));
                        setMessages((prev) => prev.filter((m) => m.id !== msg.id));
                      }}
                    >
                      Delete
                    </button>
                    {isOwn && (
                      <button
                        type="button"
                        className="underline"
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm('Delete for everyone?')) return;
                          const res = await deleteMessageForEveryone(msg.id);
                          if (res?.error) setSendError(res.error);
                        }}
                      >
                        Delete all
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="border-t border-zinc-200 bg-white p-4">
        {replyToId && (
          <div className="mb-2 flex items-center justify-between rounded-lg bg-zinc-100 px-3 py-2 text-xs text-zinc-700">
            <span>Replying…</span>
            <button type="button" className="underline" onClick={() => setReplyToId(null)}>{t('cancel')}</button>
          </div>
        )}
        {sendError && (
          <p className="mb-2 text-sm text-red-600">
            {sendError}
            <button type="button" onClick={() => setSendError(null)} className="ml-2 underline">Dismiss</button>
          </p>
        )}
        <div className="flex gap-2 items-center">
          <input ref={voiceInputRef} type="file" accept="audio/*" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || sending || !currentUserId) return;
            e.target.value = '';
            const clientId = makeClientId();
            const createdAt = new Date().toISOString();

            // If offline: store blob + queue a placeholder message
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
              setSendError(null);
              await putOutboxBlob(clientId, file);
              enqueueOutbox({ clientId, kind: 'voice', content: 'voice', created_at: createdAt, mime: file.type, name: file.name });
              const optimistic: MessageWithFlags = {
                id: `queued-${clientId}`,
                match_id: matchId,
                sender_id: currentUserId!,
                content: '🎤 Voice message',
                read_at: null,
                created_at: createdAt,
                _queued: true,
                _clientId: clientId,
                _outboxKind: 'voice',
                client_message_id: clientId,
              };
              setMessages((prev) => [...prev, optimistic]);
              return;
            }

            setUploadingVoice(true);
            const formData = new FormData(); formData.set('file', file);
            const up = await uploadChatVoice(formData);
            setUploadingVoice(false);
            if (up.ref) {
              setSendError(null);
              setSending(true);
              const tempId = `temp-${clientId}`;
              const optimistic: MessageWithFlags = {
                id: tempId,
                match_id: matchId,
                sender_id: currentUserId!,
                content: VOICE_PREFIX + up.ref,
                read_at: null,
                created_at: createdAt,
                _pending: true,
                _tempContent: VOICE_PREFIX + up.ref,
                _clientId: clientId,
                _outboxKind: 'voice',
                client_message_id: clientId,
              };
              setMessages((prev) => [...prev, optimistic]);
              const sendResult = await sendMessageWithClientId(matchId, VOICE_PREFIX + up.ref, clientId);
              setSending(false);
              if (sendResult?.error) {
                const msg = String(sendResult.error).toLowerCase();
                const looksOffline = msg.includes('fetch') || msg.includes('network') || msg.includes('failed');
                if (looksOffline) {
                  await putOutboxBlob(clientId, file);
                  enqueueOutbox({ clientId, kind: 'voice', content: 'voice', created_at: createdAt, mime: file.type, name: file.name });
                  setMessages((prev) =>
                    prev.map((m) => (m.id === tempId ? { ...(m as MessageWithFlags), _pending: false, _queued: true } : m))
                  );
                  return;
                }
                setSendError(sendResult.error);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId ? { ...(m as MessageWithFlags), _pending: false, _failed: true } : m
                  )
                );
              }
            } else if (up.error) setSendError(up.error);
          }} />
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file || sending || !currentUserId) return;
            e.target.value = '';
            const clientId = makeClientId();
            const createdAt = new Date().toISOString();

            const optimized = await compressImageFile(file, { maxDim: 1600, quality: 0.82, mimeType: 'image/jpeg' });

            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
              setSendError(null);
              await putOutboxBlob(clientId, optimized);
              enqueueOutbox({ clientId, kind: 'image', content: 'image', created_at: createdAt, mime: optimized.type, name: optimized.name });
              const optimistic: MessageWithFlags = {
                id: `queued-${clientId}`,
                match_id: matchId,
                sender_id: currentUserId!,
                content: '🖼 Photo',
                read_at: null,
                created_at: createdAt,
                _queued: true,
                _clientId: clientId,
                _outboxKind: 'image',
                client_message_id: clientId,
              };
              setMessages((prev) => [...prev, optimistic]);
              return;
            }

            setUploadingImage(true);
            const formData = new FormData(); formData.set('file', optimized);
            const up = await uploadChatImage(formData);
            setUploadingImage(false);
            if (up.ref) {
              setSendError(null);
              setSending(true);
              const tempId = `temp-${clientId}`;
              const optimistic: MessageWithFlags = {
                id: tempId,
                match_id: matchId,
                sender_id: currentUserId!,
                content: IMAGE_PREFIX + up.ref,
                read_at: null,
                created_at: createdAt,
                _pending: true,
                _tempContent: IMAGE_PREFIX + up.ref,
                _clientId: clientId,
                _outboxKind: 'image',
                client_message_id: clientId,
              };
              setMessages((prev) => [...prev, optimistic]);
              const sendResult = await sendMessageWithClientId(matchId, IMAGE_PREFIX + up.ref, clientId);
              setSending(false);
              if (sendResult?.error) {
                const msg = String(sendResult.error).toLowerCase();
                const looksOffline = msg.includes('fetch') || msg.includes('network') || msg.includes('failed');
                if (looksOffline) {
                  await putOutboxBlob(clientId, optimized);
                  enqueueOutbox({ clientId, kind: 'image', content: 'image', created_at: createdAt, mime: optimized.type, name: optimized.name });
                  setMessages((prev) =>
                    prev.map((m) => (m.id === tempId ? { ...(m as MessageWithFlags), _pending: false, _queued: true } : m))
                  );
                  return;
                }
                setSendError(sendResult.error);
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === tempId ? { ...(m as MessageWithFlags), _pending: false, _failed: true } : m
                  )
                );
              }
            } else if (up.error) setSendError(up.error);
          }} />
          <button type="button" onClick={() => voiceInputRef.current?.click()} disabled={sending || uploadingVoice} className="rounded-xl border border-zinc-200 p-3 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50" title={t('voiceMessage')}>🎤</button>
          <button type="button" onClick={() => imageInputRef.current?.click()} disabled={sending || uploadingImage} className="rounded-xl border border-zinc-200 p-3 text-zinc-600 hover:bg-zinc-50 disabled:opacity-50" title={t('photo')}>🖼</button>
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('typeMessage')}
            maxLength={2000}
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-3 focus:border-rose-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending}
            className="rounded-xl bg-rose-500 px-6 py-3 font-medium text-white transition hover:bg-rose-600 disabled:opacity-60"
          >
            {sending ? t('sending') : t('send')}
          </button>
        </div>
      </form>
    </div>
  );
}
