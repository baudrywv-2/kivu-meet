'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

const PULL_THRESHOLD = 60;
const MAX_PULL = 80;

export interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  /** Optional: custom scroll container ref. If not set, uses window. */
  scrollRef?: React.RefObject<HTMLElement | null>;
}

export function PullToRefresh({ onRefresh, children, scrollRef }: PullToRefreshProps) {
  const { t } = useLanguage();
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const atTop = useRef(true);

  const getScrollTop = useCallback(() => {
    const el = scrollRef?.current;
    if (el) return el.scrollTop;
    return window.scrollY ?? document.documentElement.scrollTop;
  }, [scrollRef]);

  const handleTouchStart = useCallback(
    (e: TouchEvent) => {
      atTop.current = getScrollTop() <= 0;
      startY.current = e.touches[0].clientY;
    },
    [getScrollTop]
  );

  const handleTouchMove = useCallback(
    (e: TouchEvent) => {
      if (!atTop.current || refreshing) return;
      const y = e.touches[0].clientY;
      const delta = y - startY.current;
      if (delta > 0 && getScrollTop() <= 0) {
        e.preventDefault();
        setPullDistance(Math.min(delta * 0.5, MAX_PULL));
      }
    },
    [getScrollTop, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (refreshing) return;
    if (pullDistance >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPullDistance(0);
      try {
        await onRefresh();
      } finally {
        setRefreshing(false);
      }
    } else {
      setPullDistance(0);
    }
  }, [onRefresh, pullDistance, refreshing]);

  useEffect(() => {
    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  const showIndicator = pullDistance > 0 || refreshing;
  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <>
      {showIndicator && (
        <div
          className="fixed left-0 right-0 top-0 z-20 flex items-center justify-center bg-white/90 transition-all duration-200"
          style={{
            height: refreshing ? 52 : Math.max(0, pullDistance * 0.5),
            opacity: progress || refreshing ? 1 : 0,
          }}
        >
          {refreshing ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#fffc00] border-t-transparent" aria-hidden />
          ) : (
            <span className="text-xs text-zinc-500">
              {pullDistance >= PULL_THRESHOLD ? t('releaseToRefresh') : t('pullToRefresh')}
            </span>
          )}
        </div>
      )}
      {children}
    </>
  );
}
