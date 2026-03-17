'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function TermsPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/settings" className="text-rose-600">← {t('back')}</Link>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">{t('termsOfService')}</h1>
      </header>
      <main className="mx-auto max-w-lg p-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm prose prose-zinc max-w-none">
          <p className="text-sm text-zinc-500">Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="mt-4 text-lg font-semibold">1. Acceptance</h2>
          <p>By using Kivu Meet you agree to these terms. If you do not agree, do not use the service.</p>
          <h2 className="mt-4 text-lg font-semibold">2. Eligibility</h2>
          <p>You must be at least 18 years old and able to form a binding contract to use Kivu Meet.</p>
          <h2 className="mt-4 text-lg font-semibold">3. Use of the service</h2>
          <p>You agree to use the service only for lawful purposes. You may not harass, abuse, or harm other users. You may not impersonate others or share false information.</p>
          <h2 className="mt-4 text-lg font-semibold">4. Content</h2>
          <p>You are responsible for the content you post. We may remove content that violates these terms or our community guidelines.</p>
          <h2 className="mt-4 text-lg font-semibold">5. Contact</h2>
          <p>For questions about these terms, contact us at the address provided in the app or on our website.</p>
        </div>
      </main>
    </div>
  );
}
