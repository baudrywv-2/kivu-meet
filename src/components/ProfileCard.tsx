'use client';

import { useState } from 'react';
import { useEffect } from 'react';

function triggerHaptic() {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(10);
  }
}
import Image from 'next/image';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Profile } from '@/types/database';
import { formatDistance } from '@/lib/utils';
import { getSignedUrlForRef } from '@/app/actions/media';
import { isStorageRef } from '@/lib/storageRef';

interface ProfileCardProps {
  profile: Profile;
  distanceKm?: number;
  voiceIntroUrl?: string | null;
  onLike?: () => void;
  onPass?: () => void;
  onSuperLike?: () => void;
  onBlock?: (userId: string) => void;
  onReport?: (userId: string) => void;
  showActions?: boolean;
  /** Prioritize image load (e.g. first discovery card) */
  priority?: boolean;
}

export function ProfileCard({
  profile,
  distanceKm,
  voiceIntroUrl,
  onLike,
  onPass,
  onSuperLike,
  onBlock,
  onReport,
  showActions = true,
  priority = false,
}: ProfileCardProps) {
  const { t } = useLanguage();
  const [menuOpen, setMenuOpen] = useState(false);
  const [playingVoice, setPlayingVoice] = useState(false);
  const refOrUrl = voiceIntroUrl ?? profile.voice_intro_url;
  const [resolvedVoiceUrl, setResolvedVoiceUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!refOrUrl) {
        setResolvedVoiceUrl(null);
        return;
      }
      if (!isStorageRef(refOrUrl)) {
        setResolvedVoiceUrl(refOrUrl);
        return;
      }
      const res = await getSignedUrlForRef(refOrUrl);
      if (!cancelled) setResolvedVoiceUrl(res.url ?? null);
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [refOrUrl]);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-black/5 bg-white shadow-snap-lg transition-transform duration-200 hover:shadow-lg">
      {(onBlock || onReport) && (
        <div className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            aria-label={t('options')}
          >
            ⋮
          </button>
          {menuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-[5]"
                onClick={() => setMenuOpen(false)}
                aria-label={t('close')}
              />
              <div className="absolute right-0 top-12 z-10 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
                {onReport && (
                  <button type="button" onClick={() => { onReport(profile.id); setMenuOpen(false); }} className="w-full cursor-pointer px-3 py-2 text-left text-xs text-zinc-700 hover:bg-zinc-100">
                    {t('report')}
                  </button>
                )}
                {onBlock && (
                  <button type="button" onClick={() => { onBlock(profile.id); setMenuOpen(false); }} className="w-full cursor-pointer px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">
                    {t('block')}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <div className="relative aspect-[3/4] w-full bg-zinc-200">
        {profile.avatar_url ? (
          <Image
            src={profile.avatar_url}
            alt={profile.name}
            fill
            className="object-cover"
            sizes="(max-width: 400px) 100vw, 400px"
            priority={priority}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-[#fffc00]/40 to-amber-200 text-6xl font-bold text-white">
            {profile.name.charAt(0)}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white">
              {profile.name}, {profile.age ?? '?'}
            </h2>
            {profile.is_verified && (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#fffc00] text-[10px] text-black" title={t('verifiedBadge')} aria-label={t('verifiedBadge')}>
                ✓
              </span>
            )}
          </div>
          <p className="text-sm text-white/90">
            {profile.city}
            {distanceKm != null && ` · ${formatDistance(distanceKm)}`}
          </p>
          {profile.bio && (
            <p className="mt-1 line-clamp-2 text-sm text-white/80">{profile.bio}</p>
          )}
          {resolvedVoiceUrl && (
            <button
              type="button"
              onClick={() => {
                const audio = new Audio(resolvedVoiceUrl);
                setPlayingVoice(true);
                audio.play().finally(() => setPlayingVoice(false));
                audio.onended = () => setPlayingVoice(false);
              }}
              className="mt-2 flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs text-white backdrop-blur-sm hover:bg-white/30"
            >
              {playingVoice ? `▶ ${t('playing')}` : `🔊 ${t('voiceIntro')}`}
            </button>
          )}
        </div>
      </div>
      {profile.interests?.length ? (
        <div className="flex flex-wrap gap-1 p-3">
          {profile.interests.slice(0, 5).map((i) => (
            <span
              key={i}
              className="rounded-full bg-[#fffc00]/30 px-2 py-0.5 text-xs text-black"
            >
              {i}
            </span>
          ))}
        </div>
      ) : null}
      {showActions && (onLike || onPass || onSuperLike) && (
        <div className="flex justify-center gap-3 p-3">
          <button
            type="button"
            onClick={() => { triggerHaptic(); onPass?.(); }}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full border-2 border-black/20 bg-white text-black/60 transition hover:bg-black/5 active:scale-95"
            aria-label={t('rewind')}
          >
            <span className="text-2xl">✕</span>
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic(); onSuperLike?.(); }}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-black text-white shadow-snap transition hover:bg-black/90 active:scale-95"
            aria-label="Super like"
          >
            <span className="text-2xl">★</span>
          </button>
          <button
            type="button"
            onClick={() => { triggerHaptic(); onLike?.(); }}
            className="flex h-14 w-14 cursor-pointer items-center justify-center rounded-full bg-[#fffc00] text-black shadow-snap transition hover:bg-[#e6e300] active:scale-95"
            aria-label={t('likes')}
          >
            <span className="text-2xl">♥</span>
          </button>
        </div>
      )}
    </div>
  );
}
