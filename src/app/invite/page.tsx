'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/contexts/LanguageContext';

export default function InvitePage() {
  const { t } = useLanguage();
  const [link, setLink] = useState<string>('');

  useEffect(() => {
    async function build() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLink(`${window.location.origin}/?ref=`);
        return;
      }
      const url = `${window.location.origin}/?ref=${user.id}`;
      setLink(url);
    }
    build();
  }, []);

  return (
    <div className="min-h-screen bg-[var(--background)] p-4">
      <div className="mx-auto max-w-lg rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <h1 className="text-lg font-bold text-zinc-900">Invite friends</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Share your link. When a friend joins, you can earn rewards (boosts / rewinds).
        </p>
        <div className="mt-4 rounded-xl bg-zinc-50 p-3">
          <p className="break-all text-sm text-zinc-800">{link || '…'}</p>
        </div>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            className="flex-1 rounded-xl bg-[#fffc00] px-4 py-2.5 text-sm font-bold text-black hover:bg-[#e6e300]"
            onClick={async () => {
              if (!link) return;
              await navigator.clipboard.writeText(link);
              alert('Copied!');
            }}
          >
            Copy link
          </button>
          <button
            type="button"
            className="flex-1 rounded-xl border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            onClick={async () => {
              if (!link) return;
              if ((navigator as any).share) {
                await (navigator as any).share({ title: t('appName'), text: 'Join me on Kivu Meet', url: link });
              } else {
                await navigator.clipboard.writeText(link);
                alert('Copied!');
              }
            }}
          >
            Share
          </button>
        </div>
      </div>
    </div>
  );
}

