'use client';

import { useState } from 'react';
import {
  signUpWithEmail,
  signInWithEmail,
  signInWithOtp,
  signInWithPhoneOtp,
  verifyPhoneOtp,
  resendConfirmationEmail,
} from '@/app/actions/auth';
import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';

interface LoginFormProps {
  /** Show app name + tagline above form (e.g. on landing left column) */
  showHeader?: boolean;
  /** Compact layout for sidebar */
  compact?: boolean;
  /** After login, redirect here (e.g. from ?redirect=/matches) */
  redirectTo?: string | null;
}

export function LoginForm({ showHeader = true, compact = false, redirectTo = null }: LoginFormProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'signin' | 'signup' | 'otp' | 'phone'>('signin');
  const [phoneMode, setPhoneMode] = useState<'enter_phone' | 'enter_code'>('enter_phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [lastEmail, setLastEmail] = useState<string>('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    let result;
    if (mode === 'signup') {
      setLastEmail(String(formData.get('email') ?? ''));
      result = await signUpWithEmail(formData);
    } else if (mode === 'otp') {
      setLastEmail(String(formData.get('email') ?? ''));
      result = await signInWithOtp(formData);
    } else if (mode === 'phone') {
      if (phoneMode === 'enter_phone') {
        result = await signInWithPhoneOtp(phone || (formData.get('phone') as string));
        if (result?.success) setPhoneMode('enter_code');
      } else {
        await verifyPhoneOtp(phone, code || (formData.get('code') as string));
        return;
      }
    } else {
      setLastEmail(String(formData.get('email') ?? ''));
      result = await signInWithEmail(formData);
    }
    if (result?.error) setMessage({ type: 'error', text: result.error });
    else if (result && 'success' in result && result.success) setMessage({ type: 'success', text: result.message ?? t('done') });
  }

  const emailNotConfirmed =
    message?.type === 'error' && /email.*not confirmed|not confirmed/i.test(message.text);

  const inputClass = 'w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-[var(--snap-blue)] focus:outline-none';
  const btnPrimary = 'w-full rounded-full bg-[var(--snap-blue)] py-3 text-sm font-bold text-white shadow-snap transition hover:bg-[var(--snap-blue-hover)] active:scale-[0.98]';
  const tabClass = (active: boolean) => (active ? 'font-semibold text-[var(--snap-blue)]' : 'text-stone-500 hover:text-stone-700');

  return (
    <div className={compact ? 'w-full max-w-sm' : 'w-full max-w-md'}>
      {showHeader && (
        <>
          <h1 className="text-2xl font-black tracking-tight text-black sm:text-3xl">{t('logInToApp', { app: t('appName') })}</h1>
          <p className={compact ? 'mt-0.5 text-sm text-black/60' : 'mt-1 text-sm text-black/60'}>{t('taglineShort')}</p>
        </>
      )}
      {message && (
        <div
          className={`${compact ? 'mt-3' : 'mt-4'} rounded-lg p-2.5 text-xs ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
        >
          {message.text}
        </div>
      )}
      {emailNotConfirmed && lastEmail && (
        <button
          type="button"
          onClick={async () => {
            const res = await resendConfirmationEmail(lastEmail);
            if (res?.error) setMessage({ type: 'error', text: res.error });
            else setMessage({ type: 'success', text: res?.message ?? t('done') });
          }}
          className={`${compact ? 'mt-2' : 'mt-3'} w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50`}
        >
          {t('resendConfirmationEmail') ?? 'Resend confirmation email'}
        </button>
      )}
      {mode === 'phone' && phoneMode === 'enter_code' ? (
        <form action={handleSubmit} onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className={compact ? 'mt-3 space-y-2.5' : 'mt-4 space-y-3'}>
          <input type="hidden" name="phone" value={phone} />
          <input name="code" type="text" placeholder={t('enterCode')} maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} className={inputClass} />
          <button type="submit" className={btnPrimary}>{t('verify')}</button>
          <button type="button" onClick={() => setPhoneMode('enter_phone')} className="w-full text-xs text-[var(--snap-blue)] hover:underline">{t('changeNumber')}</button>
        </form>
      ) : (
        <form action={handleSubmit} onSubmit={(e) => { e.preventDefault(); handleSubmit(new FormData(e.currentTarget)); }} className={compact ? 'mt-3 space-y-2.5' : 'mt-4 space-y-3'}>
          {redirectTo && <input type="hidden" name="redirect" value={redirectTo} />}
          {mode === 'phone' ? (
            <input name="phone" type="tel" placeholder="+243 812 345 678" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          ) : (
            <>
              <input
                name="email"
                type="email"
                placeholder={t('email')}
                required
                defaultValue={lastEmail}
                className={inputClass}
              />
              {mode !== 'otp' && (
                <>
                  <input name="password" type="password" placeholder={t('password')} required={mode === 'signup'} minLength={6} className={inputClass} />
                  {mode === 'signin' && (
                    <Link href="/forgot-password" className="block text-right text-xs text-[var(--snap-blue)] hover:underline">{t('forgotPassword')}</Link>
                  )}
                </>
              )}
            </>
          )}
          {mode !== 'phone' && (
            <Link href="#" onClick={(e) => { e.preventDefault(); setMode('phone'); setMessage(null); }} className="block text-xs text-[var(--snap-blue)] hover:underline">
              {t('usePhoneNumberInstead')}
            </Link>
          )}
          <button type="submit" className={btnPrimary}>
            {mode === 'signup' ? t('signUp') : mode === 'otp' ? t('magicLink') : mode === 'phone' ? t('sendCode') : t('signIn')}
          </button>
        </form>
      )}
      <div className="mt-3 flex flex-wrap justify-center gap-1.5 text-xs">
        <button type="button" onClick={() => { setMode('signin'); setPhoneMode('enter_phone'); }} className={tabClass(mode === 'signin')}>{t('signIn')}</button>
        <span className="text-zinc-300">·</span>
        <button type="button" onClick={() => { setMode('signup'); setPhoneMode('enter_phone'); }} className={tabClass(mode === 'signup')}>{t('signUp')}</button>
        <span className="text-zinc-300">·</span>
        <button type="button" onClick={() => { setMode('otp'); setPhoneMode('enter_phone'); }} className={tabClass(mode === 'otp')}>{t('magicLink')}</button>
        <span className="text-zinc-300">·</span>
        <button type="button" onClick={() => { setMode('phone'); setPhoneMode('enter_phone'); setMessage(null); }} className={tabClass(mode === 'phone')}>{t('phone')}</button>
      </div>
    </div>
  );
}
