'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

export default function PrivacyPage() {
  const { t } = useLanguage();
  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white px-4 py-3">
        <Link href="/settings" className="text-rose-600">← {t('back')}</Link>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">{t('privacyPolicy')}</h1>
      </header>
      <main className="mx-auto max-w-lg p-4">
        <div className="rounded-2xl bg-white p-6 shadow-sm prose prose-zinc max-w-none">
          <p className="text-sm text-zinc-500">Last updated: {new Date().toLocaleDateString()}</p>
          <h2 className="mt-4 text-lg font-semibold">1. Information we collect</h2>
          <p>We collect information you provide (profile, photos, messages) and technical data (device, IP) necessary to run the service.</p>
          <h2 className="mt-4 text-lg font-semibold">2. How we use it</h2>
          <p>We use your information to operate Kivu Meet, show you relevant profiles, enable matching and chat, and improve the service.</p>
          <h2 className="mt-4 text-lg font-semibold">3. Sharing</h2>
          <p>Your profile is visible to other users in your city as set in the app. We do not sell your personal data to third parties.</p>
          <h2 className="mt-4 text-lg font-semibold">4. Data retention</h2>
          <p>We retain your data while your account is active. You can delete your account and data at any time from Settings.</p>
          <h2 className="mt-4 text-lg font-semibold">5. Contact</h2>
          <p>For privacy questions or requests, contact us at the address provided in the app.</p>
        </div>
      </main>
    </div>
  );
}
