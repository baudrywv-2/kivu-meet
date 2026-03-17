'use client';

import Link from 'next/link';

export type EmptyStateIllustration = 'noMatches' | 'noMessages' | 'noConfessions';

interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  /** Optional illustration variant (SVG) shown above title */
  illustration?: EmptyStateIllustration;
}

function IllustrationSvg({ type }: { type: EmptyStateIllustration }) {
  const size = 80;
  if (type === 'noMatches') {
    return (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className="mx-auto text-rose-200" aria-hidden>
        <circle cx="28" cy="40" r="14" fill="currentColor" opacity="0.6" />
        <circle cx="52" cy="40" r="14" fill="currentColor" opacity="0.6" />
        <path d="M28 54c0-8 6-12 12-12s12 4 12 12" stroke="currentColor" strokeWidth="2" opacity="0.5" fill="none" />
        <path d="M52 54c0-8 6-12 12-12s12 4 12 12" stroke="currentColor" strokeWidth="2" opacity="0.5" fill="none" />
      </svg>
    );
  }
  if (type === 'noMessages') {
    return (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className="mx-auto text-zinc-300" aria-hidden>
        <path d="M12 20c0-4.4 4-8 8-8h40c4.4 0 8 3.6 8 8v24c0 4.4-3.6 8-8 8H28L16 68V20z" fill="currentColor" opacity="0.5" />
        <path d="M20 28h40M20 36h28" stroke="white" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </svg>
    );
  }
  if (type === 'noConfessions') {
    return (
      <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className="mx-auto text-amber-200" aria-hidden>
        <ellipse cx="40" cy="42" rx="24" ry="22" fill="currentColor" opacity="0.6" />
        <path d="M24 38c4-6 10-10 16-10s12 4 16 10" stroke="currentColor" strokeWidth="2" opacity="0.7" fill="none" strokeLinecap="round" />
        <circle cx="34" cy="40" r="2" fill="currentColor" opacity="0.8" />
        <circle cx="46" cy="40" r="2" fill="currentColor" opacity="0.8" />
      </svg>
    );
  }
  return null;
}

export function EmptyState({
  emoji,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  illustration,
}: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-8 text-center shadow-snap animate-fade-in-up">
      {illustration ? (
        <div className="flex justify-center">
          <IllustrationSvg type={illustration} />
        </div>
      ) : (
        <p className="text-6xl" aria-hidden>{emoji}</p>
      )}
      <h2 className="mt-4 text-xl font-bold text-zinc-900">{title}</h2>
      <p className="mt-2 text-zinc-600">{description}</p>
      {(actionLabel && (actionHref || onAction)) && (
        actionHref ? (
          <Link
            href={actionHref}
            className="mt-6 inline-block rounded-full bg-[#fffc00] px-8 py-3 font-bold text-black shadow-snap transition hover:bg-[#e6e300] active:scale-95"
          >
            {actionLabel}
          </Link>
        ) : (
          <button
            type="button"
            onClick={onAction}
            className="mt-6 rounded-full bg-[#fffc00] px-8 py-3 font-bold text-black shadow-snap transition hover:bg-[#e6e300] active:scale-95"
          >
            {actionLabel}
          </button>
        )
      )}
    </div>
  );
}
