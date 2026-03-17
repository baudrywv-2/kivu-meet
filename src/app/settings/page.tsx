'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { signOut } from '@/app/actions/auth';
import { updateProfile } from '@/app/actions/profile';
import { updateLocation } from '@/app/actions/profile';
import { deleteAccount } from '@/app/actions/account';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import type { Theme } from '@/contexts/ThemeContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { PageSkeleton } from '@/components/PageSkeleton';
import Link from 'next/link';

const SOUND_STORAGE_KEY = 'kivu-sound-effects';
function getSoundEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(SOUND_STORAGE_KEY) !== 'false';
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [soundEffects, setSoundEffects] = useState(false);
  const [pushMatch, setPushMatch] = useState(true);
  const [pushMessage, setPushMessage] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleUseLocation() {
    setLocationError(null);
    setLocationLoading(true);
    if (!navigator.geolocation) {
      setLocationError(t('geolocationNotSupported'));
      setLocationLoading(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const err = await updateLocation(pos.coords.latitude, pos.coords.longitude);
        if (err?.error) setLocationError(err.error);
        setLocationLoading(false);
      },
      () => {
        setLocationError(t('couldNotGetLocation'));
        setLocationLoading(false);
      }
    );
  }

  useEffect(() => {
    setSoundEffects(getSoundEnabled());
  }, []);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('is_visible, push_match_enabled, push_message_enabled')
        .eq('id', user.id)
        .single();
      if (data) {
        setIsVisible(data.is_visible ?? true);
        setPushMatch((data as { push_match_enabled?: boolean }).push_match_enabled !== false);
        setPushMessage((data as { push_message_enabled?: boolean }).push_message_enabled !== false);
      }
      setLoading(false);
    }
    load();
  }, [supabase]);

  function handleSoundToggle() {
    const next = !soundEffects;
    setSoundEffects(next);
    if (typeof window !== 'undefined') localStorage.setItem(SOUND_STORAGE_KEY, String(next));
  }

  async function handleVisibilityToggle() {
    setSaving(true);
    await updateProfile({ is_visible: !isVisible });
    setIsVisible(!isVisible);
    setSaving(false);
  }

  async function handlePushMatchToggle() {
    setSaving(true);
    await updateProfile({ push_match_enabled: !pushMatch });
    setPushMatch(!pushMatch);
    setSaving(false);
  }

  async function handlePushMessageToggle() {
    setSaving(true);
    await updateProfile({ push_message_enabled: !pushMessage });
    setPushMessage(!pushMessage);
    setSaving(false);
  }

  if (loading) return <PageSkeleton variant="centered" />;

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 flex items-center border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-sm">
        <Link href="/profile" className="text-xs font-medium text-black hover:opacity-80">
          ← {t('back')}
        </Link>
        <h1 className="ml-3 flex-1 text-base font-bold text-zinc-900">{t('settings')}</h1>
        <LanguageSelector compact />
      </header>

      <main className="mx-auto max-w-lg p-3 sm:p-4">
        <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{t('showInDiscovery')}</p>
                <p className="text-xs text-zinc-500">{t('showInDiscoveryDesc')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={isVisible}
                onClick={handleVisibilityToggle}
                disabled={saving}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                  isVisible ? 'bg-[#fffc00]' : 'bg-zinc-200'
                }`}
              >
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${isVisible ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          <div className="border-b border-zinc-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{t('useLocation')}</p>
                <p className="text-xs text-zinc-500">{t('useLocationDesc')}</p>
              </div>
              <button
                type="button"
                onClick={handleUseLocation}
                disabled={locationLoading}
                className="rounded-lg bg-[#fffc00] px-3 py-1.5 text-xs font-bold text-black hover:bg-[#e6e300] disabled:opacity-50"
              >
                {locationLoading ? '…' : t('update')}
              </button>
            </div>
            {locationError && <p className="mt-1 text-xs text-red-600">{locationError}</p>}
          </div>
          <div className="border-b border-zinc-100 p-3">
            <p className="text-sm font-medium text-zinc-900">{t('theme')}</p>
            <div className="mt-2 flex gap-2">
              {(['light', 'dark', 'system'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setTheme(opt)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${
                    theme === opt ? 'border-[var(--primary)] bg-[var(--primary)]/20 text-[var(--foreground)]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                  }`}
                >
                  {opt === 'light' ? t('themeLight') : opt === 'dark' ? t('themeDark') : t('themeSystem')}
                </button>
              ))}
            </div>
          </div>
          <div className="border-b border-zinc-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{t('soundEffects')}</p>
                <p className="text-xs text-zinc-500">{t('soundEffectsDesc')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={soundEffects}
                onClick={handleSoundToggle}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${soundEffects ? 'bg-[#fffc00]' : 'bg-zinc-200'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${soundEffects ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <div className="border-b border-zinc-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{t('notificationsMatch')}</p>
                <p className="text-xs text-zinc-500">{t('notificationsMatchDesc')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pushMatch}
                onClick={handlePushMatchToggle}
                disabled={saving}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${pushMatch ? 'bg-[#fffc00]' : 'bg-zinc-200'} disabled:opacity-50`}
              >
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${pushMatch ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <div className="border-b border-zinc-100 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-zinc-900">{t('notificationsMessage')}</p>
                <p className="text-xs text-zinc-500">{t('notificationsMessageDesc')}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={pushMessage}
                onClick={handlePushMessageToggle}
                disabled={saving}
                className={`relative h-7 w-12 shrink-0 rounded-full transition ${pushMessage ? 'bg-[#fffc00]' : 'bg-zinc-200'} disabled:opacity-50`}
              >
                <span className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow transition ${pushMessage ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>
          <div className="p-3">
            <Link href="/profile/edit" className="block rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-stone-700 hover:bg-zinc-50">
              {t('editProfile')}
            </Link>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <Link href="/settings/safety" className="block w-full rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-stone-600 hover:bg-zinc-50">
            {t('safetyTips')}
          </Link>
          <Link href="/settings/verification" className="block w-full rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-stone-600 hover:bg-zinc-50">
            {t('verification')}
          </Link>
          <Link href="/settings/blocked" className="block w-full rounded-lg border border-zinc-200 py-2.5 text-center text-sm font-medium text-stone-600 hover:bg-zinc-50">
            {t('blockedUsers')}
          </Link>
          <form action={signOut}>
            <button type="submit" className="w-full rounded-lg border border-zinc-200 py-2.5 text-sm font-medium text-stone-600 hover:bg-zinc-50">
              {t('signOut')}
            </button>
          </form>
        </div>

        <div className="mt-6 border-t border-zinc-200 pt-4">
          <button
            type="button"
            onClick={async () => {
              if (!confirm(t('deleteConfirm'))) return;
              setDeleting(true);
              await deleteAccount();
            }}
            disabled={deleting}
            className="w-full rounded-lg border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            {deleting ? t('deleting') : t('deleteAccount')}
          </button>
        </div>

        <div className="mt-4 flex justify-center gap-3 text-xs">
          <Link href="/terms" className="text-stone-500 hover:text-black">{t('termsOfService')}</Link>
          <Link href="/privacy" className="text-stone-500 hover:text-black">{t('privacyPolicy')}</Link>
        </div>

        <p className="mt-6 text-center text-xs text-stone-400">
          {t('appName')} · Goma, Bukavu, Beni, Butembo, Kinshasa, Lubumbashi, Kisangani, Matadi
        </p>
      </main>
    </div>
  );
}
