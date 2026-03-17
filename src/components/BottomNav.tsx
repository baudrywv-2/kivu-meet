'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/contexts/LanguageContext';

export interface BottomNavProps {
  /** Optional unread message count to show on Matches tab */
  unreadCount?: number;
}

const NAV_ITEMS = [
  { href: '/discovery', labelKey: 'discovery', icon: '◇' },
  { href: '/matches', labelKey: 'matches', icon: '♥' },
  { href: '/confessions', labelKey: 'confessions', icon: '☁' },
  { href: '/profile', labelKey: 'profile', icon: '👤' },
] as const;

export function BottomNav({ unreadCount = 0 }: BottomNavProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-zinc-200 bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Main navigation"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {NAV_ITEMS.map(({ href, labelKey, icon }) => {
          const isActive = pathname === href || (href !== '/discovery' && pathname.startsWith(href));
          const isMatches = href === '/matches';
          return (
            <Link
              key={href}
              href={href}
              className={`relative flex min-w-0 flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ${
                isActive ? 'text-black' : 'text-zinc-500 hover:text-zinc-700'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="text-lg leading-none" aria-hidden>
                {icon}
              </span>
              <span>{t(labelKey)}</span>
              {isMatches && unreadCount > 0 && (
                <span className="absolute right-1/4 top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
