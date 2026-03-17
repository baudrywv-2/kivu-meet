'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { getSignedUrlForRef } from '@/app/actions/media';

type Req = {
  id: string;
  user_id: string;
  selfie_ref: string;
  status: string;
  created_at: string;
};

export default function AdminVerificationPage() {
  const supabase = createClient();
  const [items, setItems] = useState<Req[]>([]);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('verification_requests')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setItems((data ?? []) as any);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function resolve(ref: string) {
    if (preview[ref]) return preview[ref];
    const res = await getSignedUrlForRef(ref);
    if (res.url) setPreview((p) => ({ ...p, [ref]: res.url! }));
    return res.url ?? '';
  }

  async function setStatus(req: Req, status: 'approved' | 'rejected') {
    await supabase.from('verification_requests').update({
      status,
      reviewed_at: new Date().toISOString(),
    }).eq('id', req.id);

    if (status === 'approved') {
      await supabase.from('profiles').update({ is_verified: true, verification_status: 'approved' }).eq('id', req.user_id);
    } else {
      await supabase.from('profiles').update({ is_verified: false, verification_status: 'rejected' }).eq('id', req.user_id);
    }
    setItems((prev) => prev.map((x) => x.id === req.id ? { ...x, status } : x));
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Verification requests</h2>
      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : items.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-zinc-500">No requests</div>
      ) : (
        <div className="space-y-4">
          {items.map((r) => (
            <div key={r.id} className="rounded-lg bg-white p-4 shadow">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-zinc-900">User: {r.user_id}</p>
                  <p className="text-xs text-zinc-500">{new Date(r.created_at).toLocaleString()} · {r.status}</p>
                </div>
                <div className="flex gap-2">
                  <button className="rounded bg-green-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-green-700" onClick={() => setStatus(r, 'approved')}>Approve</button>
                  <button className="rounded bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700" onClick={() => setStatus(r, 'rejected')}>Reject</button>
                </div>
              </div>
              <div className="mt-3">
                <button
                  type="button"
                  className="text-xs text-rose-600 underline"
                  onClick={async () => {
                    const url = await resolve(r.selfie_ref);
                    if (url) window.open(url, '_blank', 'noopener,noreferrer');
                  }}
                >
                  Open selfie
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

