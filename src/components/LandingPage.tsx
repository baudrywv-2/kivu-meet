'use client';

import Link from 'next/link';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import { LoginForm } from '@/components/LoginForm';

import { CITIES } from '@/lib/constants';

export function LandingPage() {
  const { t } = useLanguage();

  const VIDEO_BLOCKS = [
    { headline: t('discoverNearby'), cta: t('findYourFriends'), href: '/login', gradient: 'from-amber-400/90 via-[#fffc00]/80 to-rose-300/90' },
    { headline: t('matchChat'), cta: t('getStarted'), href: '/login', gradient: 'from-[#fffc00]/80 via-amber-200/90 to-orange-300/80' },
    { headline: t('confessions'), cta: t('tryNow'), href: '/login', gradient: 'from-rose-300/80 via-amber-200/90 to-[#fffc00]/70' },
    { headline: t('readyToMeet'), cta: t('getStarted'), href: '/login', gradient: 'from-black/20 via-zinc-400/30 to-[#fffc00]/50' },
  ];

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-white">
      <header className="flex-shrink-0 border-b border-black/5 bg-white/95 backdrop-blur-xl z-10">
        <div className="mx-auto flex h-12 max-w-6xl w-full items-center px-4 sm:px-5">
          <Link href="/" className="shrink-0 text-lg font-black tracking-tight text-black transition hover:opacity-80">
            {t('appName')}
          </Link>
          <nav className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
            <LanguageSelector compact />
            <Link href="/login" className="text-sm font-semibold text-black/70 hover:text-black">
              {t('logIn')}
            </Link>
            <Link href="/login" className="rounded-full bg-[#fffc00] px-5 py-2 text-sm font-bold text-black shadow-snap transition hover:bg-[#e6e300] active:scale-95 sm:px-6">
              {t('getStarted')}
            </Link>
          </nav>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {/* Left: static login form — never scrolls */}
        <aside className="flex shrink-0 flex-col justify-center border-b border-black/5 bg-white px-4 py-6 sm:px-5 sm:py-8 lg:min-h-0 lg:min-w-[380px] lg:max-w-[380px] lg:border-b-0 lg:border-r lg:border-black/5 lg:px-8 lg:py-10">
          <LoginForm showHeader compact />
        </aside>

        {/* Right: only this side scrolls */}
        <div className="min-h-0 flex-1 overflow-y-auto lg:min-w-0">
          {VIDEO_BLOCKS.map((block, i) => (
            <section
              key={i}
              className="relative flex min-h-[32vh] flex-col justify-start gap-3 overflow-hidden px-4 py-6 sm:px-5 sm:py-8 lg:min-h-[38vh] lg:px-8"
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${block.gradient}`} aria-hidden />
              <h2 className="relative text-2xl font-black tracking-tight text-white drop-shadow-md sm:text-3xl lg:text-4xl">
                {block.headline}
              </h2>
              <div className="relative">
                <Link
                  href={block.href}
                  className="inline-block rounded-full bg-white px-6 py-3 text-sm font-bold text-black shadow-snap transition hover:bg-black/5 active:scale-95"
                >
                  {block.cta}
                </Link>
              </div>
            </section>
          ))}

          <section className="border-t border-black/5 bg-[#fffc00]/10 px-4 py-6 sm:px-5 lg:px-8">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-xl font-black text-black sm:text-2xl">{t('availableInCity')}</h2>
              <p className="mt-1.5 text-sm text-black/60">{t('availableInCityDesc')}</p>
              <div className="mt-2.5 flex flex-wrap justify-center gap-2">
                {CITIES.map((city) => (
                  <span key={city} className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black shadow-snap ring-1 ring-black/10">
                    {city}
                  </span>
                ))}
              </div>
            </div>
          </section>

          <section className="border-t border-black/5 px-4 py-6 sm:px-5 lg:px-8">
            <div className="mx-auto max-w-md text-center">
              <Link href="/login" className="inline-block rounded-full bg-[var(--snap-blue)] px-6 py-3 text-base font-bold text-white shadow-snap-lg transition hover:bg-[var(--snap-blue-hover)] active:scale-95">
                {t('getStartedFree')}
              </Link>
            </div>
          </section>

          <footer className="border-t border-black/5 bg-white/95 px-4 py-4 sm:px-5 lg:px-8">
            <div className="mx-auto flex max-w-3xl flex-col items-center justify-between gap-2 sm:flex-row sm:items-center">
              <span className="text-sm font-medium text-black/50">© {t('appName')}</span>
              <nav className="flex gap-6 text-sm font-semibold">
                <Link href="/terms" className="text-black/60 hover:text-black">{t('terms')}</Link>
                <Link href="/privacy" className="text-black/60 hover:text-black">{t('privacy')}</Link>
                <Link href="/login" className="text-black/60 hover:text-black">{t('logIn')}</Link>
              </nav>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
