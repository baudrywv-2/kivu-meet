'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

const TIP_KEYS = [
  'safetyTipMeetPublic',
  'safetyTipNoMoney',
  'safetyTipReport',
  'safetyTipTrustGut',
  'safetyTipShareDetails',
] as const;

export default function SafetyTipsPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex items-center border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-sm">
        <Link href="/settings" className="text-xs font-medium text-black hover:opacity-80">
          ← {t('back')}
        </Link>
        <h1 className="ml-3 flex-1 text-base font-bold text-zinc-900">{t('safetyTipsTitle')}</h1>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <p className="mb-6 text-sm text-zinc-600">{t('safetyTipsIntro')}</p>
        <ul className="space-y-4">
          {TIP_KEYS.map((key, i) => (
            <li key={key} className="flex gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#fffc00]/40 text-xs font-bold text-black">
                {i + 1}
              </span>
              <p className="text-sm text-zinc-800">{t(key)}</p>
            </li>
          ))}
        </ul>
        <div className="mt-8 border-t border-zinc-200 pt-4">
          <Link
            href="/settings"
            className="inline-block rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            {t('back')} {t('settings')}
          </Link>
        </div>
      </main>
    </div>
  );
}
