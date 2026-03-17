'use client';

import { useState } from 'react';
import { resetPasswordForEmail } from '@/app/actions/auth';
import { useLanguage } from '@/contexts/LanguageContext';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setLoading(true);
    const result = await resetPasswordForEmail(email.trim());
    setLoading(false);
    if (result?.error) setMessage({ type: 'error', text: result.error });
    else setMessage({ type: 'success', text: result?.message ?? t('resetPasswordEmailSent') });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-rose-50 to-amber-50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <Link href="/login" className="text-sm text-zinc-500 hover:text-rose-600">← {t('back')}</Link>
        <h1 className="mt-4 text-xl font-bold text-rose-600">{t('forgotPassword')}</h1>
        <p className="mt-2 text-sm text-zinc-500">
          {t('forgotPasswordDesc')}
        </p>

        {message && (
          <div
            className={`mt-4 rounded-lg p-3 text-sm ${
              message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('email')}
            required
            className="w-full rounded-xl border border-zinc-200 px-4 py-3 focus:border-rose-400 focus:outline-none"
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-rose-500 py-3 font-medium text-white hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? t('sending') : t('sendCode')}
          </button>
        </form>
      </div>
    </div>
  );
}
