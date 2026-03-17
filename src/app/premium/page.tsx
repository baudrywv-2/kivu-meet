'use client';

import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

export default function PremiumPage() {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex items-center border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
        <Link href="/profile" className="text-xs font-medium text-black dark:text-zinc-200 hover:opacity-80">
          ← {t('back')}
        </Link>
        <h1 className="ml-3 flex-1 text-base font-bold text-zinc-900 dark:text-zinc-100">{t('upgradePremium')}</h1>
      </header>

      <main className="mx-auto max-w-lg p-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('upgradePremium')}</p>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t('upgradePremiumDesc')}</p>
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
            <li>See who liked you</li>
            <li>More super likes per day</li>
            <li>Unlimited rewinds</li>
          </ul>
          <p className="mt-6 text-xs text-zinc-500 dark:text-zinc-500">
            Premium is coming soon. For now, enjoy one free super like per day and rewind in Discovery.
          </p>
          <Link
            href="/profile"
            className="mt-6 block w-full rounded-lg bg-[#fffc00] py-2.5 text-center text-sm font-bold text-black hover:bg-[#e6e300]"
          >
            {t('back')}
          </Link>
        </div>
      </main>
    </div>
  );
}
