'use client';

import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { LOCALES, type Locale } from '@/lib/i18n';

export function LanguageSelector({ compact = false }: { compact?: boolean }) {
  const { locale, setLocale } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const current = LOCALES.find((l) => l.code === locale);

  if (compact) {
    return (
      <div className="relative" ref={ref}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 hover:text-zinc-900"
          aria-label="Language"
          aria-expanded={open}
        >
          <span className="text-base" aria-hidden>🌐</span>
          <span>{current?.code.toUpperCase() ?? 'EN'}</span>
          <span className="text-zinc-400">▾</span>
        </button>
        {open && (
          <div className="absolute right-0 top-full z-50 mt-1 min-w-[8rem] rounded-lg border border-zinc-200 bg-white py-1 shadow-lg">
            {LOCALES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => {
                  setLocale(l.code as Locale);
                  setOpen(false);
                }}
                className={`w-full px-3 py-2 text-left text-sm transition ${
                  locale === l.code
                    ? 'bg-rose-50 font-medium text-rose-600'
                    : 'text-zinc-700 hover:bg-zinc-50'
                }`}
              >
                {l.native}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition hover:border-rose-200 hover:bg-rose-50/50 hover:text-rose-600"
        aria-label="Language"
        aria-expanded={open}
      >
        <span className="text-lg" aria-hidden>🌐</span>
        <span>{current?.native ?? 'English'}</span>
        <span className="text-zinc-400">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-xl border border-zinc-200 bg-white py-1.5 shadow-xl">
          {LOCALES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => {
                setLocale(l.code as Locale);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition ${
                locale === l.code
                  ? 'bg-rose-50 font-medium text-rose-600'
                  : 'text-zinc-700 hover:bg-zinc-50'
              }`}
            >
              <span>{l.native}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
