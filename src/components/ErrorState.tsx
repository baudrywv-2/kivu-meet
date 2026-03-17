'use client';

interface ErrorStateProps {
  message?: string;
  title?: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export function ErrorState({
  message = 'Something went wrong.',
  title = "Couldn't load",
  onRetry,
  retryLabel = 'Try again',
}: ErrorStateProps) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm animate-fade-in-up">
      <p className="text-3xl" aria-hidden>⚠️</p>
      <h2 className="mt-3 text-base font-semibold text-stone-800">{title}</h2>
      <p className="mt-1 text-sm text-stone-500">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-4 rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-black hover:bg-zinc-50">
          {retryLabel}
        </button>
      )}
    </div>
  );
}
