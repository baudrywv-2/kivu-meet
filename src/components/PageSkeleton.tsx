'use client';

interface PageSkeletonProps {
  variant?: 'cards' | 'list' | 'centered';
}

export function PageSkeleton({ variant = 'centered' }: PageSkeletonProps) {
  if (variant === 'centered') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12 text-zinc-500">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#fffc00] border-t-transparent" aria-hidden />
        <p>Loading...</p>
      </div>
    );
  }

  if (variant === 'cards') {
    return (
      <div className="w-full max-w-sm">
        <div className="overflow-hidden rounded-2xl bg-white shadow-xl">
          <div className="aspect-[3/4] w-full animate-shimmer rounded-t-2xl bg-zinc-200" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-2/3 rounded bg-zinc-200" />
            <div className="h-4 w-1/2 rounded bg-zinc-100" />
            <div className="flex justify-center gap-4 pt-4">
              <div className="h-14 w-14 animate-shimmer rounded-full bg-zinc-200" />
              <div className="h-14 w-14 animate-shimmer rounded-full bg-zinc-200" style={{ animationDelay: '0.1s' }} />
              <div className="h-14 w-14 animate-shimmer rounded-full bg-zinc-200" style={{ animationDelay: '0.2s' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // list
  return (
    <ul className="space-y-2">
      {[1, 2, 3, 4].map((i) => (
        <li key={i} className="flex items-center gap-4 rounded-xl bg-white p-4 shadow-sm">
          <div className="h-14 w-14 shrink-0 animate-shimmer rounded-full bg-zinc-200" style={{ animationDelay: `${i * 0.08}s` }} />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-24 rounded bg-zinc-200" />
            <div className="h-3 w-full rounded bg-zinc-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
