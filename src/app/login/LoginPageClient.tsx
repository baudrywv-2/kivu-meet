'use client';

import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LoginForm } from '@/components/LoginForm';

function safeRedirectPath(path: string | null): string | null {
  if (!path || typeof path !== 'string') return null;
  const p = path.trim();
  if (!p.startsWith('/') || p.startsWith('//')) return null;
  return p;
}

export function LoginPageClient() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const redirectTo = safeRedirectPath(searchParams.get('redirect'));

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white p-3 sm:p-4">
      <div className="absolute right-3 top-3 sm:right-4 sm:top-4">
        <LanguageSelector compact />
      </div>
      <div className="w-full max-w-sm rounded-2xl border border-black/5 bg-white p-6 shadow-snap-lg animate-scale-in sm:p-8">
        <Link href="/" className="text-xs text-stone-500 hover:text-black">
          ← {t('backToHome')}
        </Link>
        <Link href="/" className="mt-3 mb-1 block text-2xl font-black text-black transition hover:opacity-80">
          {t('appName')}
        </Link>
        <p className="mb-5 text-xs text-stone-500">{t('tagline')}</p>
        <LoginForm showHeader={false} compact redirectTo={redirectTo} />
      </div>
    </div>
  );
}

