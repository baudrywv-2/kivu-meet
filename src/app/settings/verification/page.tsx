'use client';

import { useEffect, useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';
import { uploadVerificationSelfie } from '@/app/actions/verification';
import Link from 'next/link';
import type { Profile } from '@/types/database';

export default function VerificationPage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(data as Profile);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const file = (e.currentTarget.elements.namedItem('file') as HTMLInputElement)?.files?.[0];
    if (!file) {
      setError(t('verificationNoFile'));
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.set('file', file);
    const result = await uploadVerificationSelfie(formData);
    setSubmitting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setProfile((prev) => (prev ? { ...prev, verification_status: 'pending' } : null));
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-zinc-500">{t('loading')}</p>
      </div>
    );
  }

  const isVerified = profile?.is_verified === true;
  const isPending = profile?.verification_status === 'pending' && !isVerified;
  const isRejected = profile?.verification_status === 'rejected';

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex items-center border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-sm dark:border-zinc-700 dark:bg-zinc-900/95">
        <Link href="/settings" className="text-xs font-medium text-black dark:text-zinc-200 hover:opacity-80">
          ← {t('back')}
        </Link>
        <h1 className="ml-3 flex-1 text-base font-bold text-zinc-900 dark:text-zinc-100">{t('verification')}</h1>
      </header>

      <main className="mx-auto max-w-lg p-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-700 dark:bg-zinc-900">
          {isVerified ? (
            <div className="text-center">
              <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#fffc00] text-2xl text-black" aria-hidden>
                ✓
              </span>
              <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('verifiedBadge')}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('verifiedBadgeDesc')}</p>
            </div>
          ) : isPending ? (
            <div className="text-center">
              <p className="text-6xl" aria-hidden>⏳</p>
              <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('verificationUnderReview')}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('verificationUnderReviewDesc')}</p>
              <Link href="/settings" className="mt-6 inline-block rounded-lg bg-[#fffc00] px-6 py-2.5 text-sm font-bold text-black hover:bg-[#e6e300]">
                {t('back')}
              </Link>
            </div>
          ) : isRejected ? (
            <div className="text-center">
              <p className="text-6xl" aria-hidden>😕</p>
              <h2 className="mt-3 text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('verificationRejected')}</h2>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{t('verificationRejectedDesc')}</p>
              <Link href="/settings" className="mt-6 inline-block rounded-lg bg-[#fffc00] px-6 py-2.5 text-sm font-bold text-black hover:bg-[#e6e300]">
                {t('back')}
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">{t('verificationTitle')}</h2>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">{t('verificationIntro')}</p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div>
                  <label htmlFor="verification-file" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {t('verificationSelfie')}
                  </label>
                  <input
                    ref={fileInputRef}
                    id="verification-file"
                    name="file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="mt-1 block w-full text-sm text-zinc-600 file:mr-3 file:rounded-lg file:border-0 file:bg-[#fffc00] file:px-4 file:py-2 file:font-bold file:text-black file:hover:bg-[#e6e300]"
                  />
                  <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{t('verificationSelfieHint')}</p>
                </div>
                {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-lg bg-[#fffc00] py-2.5 text-sm font-bold text-black hover:bg-[#e6e300] disabled:opacity-50"
                >
                  {submitting ? t('uploading') : t('verificationSubmit')}
                </button>
              </form>
              <Link href="/settings" className="mt-4 block text-center text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                {t('back')}
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
