'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Confession } from '@/types/database';

export default function AdminConfessionsPage() {
  const [confessions, setConfessions] = useState<Confession[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('confessions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setConfessions(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function removeConfession(id: string) {
    if (!confirm('Remove this confession?')) return;
    await supabase
      .from('confessions')
      .update({ is_removed: true })
      .eq('id', id);
    setConfessions((prev) => prev.filter((c) => c.id !== id));
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Confessions</h2>
      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : (
        <div className="space-y-4">
          {confessions.filter((c) => !c.is_removed).map((c) => (
            <div
              key={c.id}
              className="rounded-lg bg-white p-4 shadow"
            >
              <p className="text-zinc-800">{c.content}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {c.city} • {c.likes_count} likes • {new Date(c.created_at).toLocaleString()}
              </p>
              <button
                onClick={() => removeConfession(c.id)}
                className="mt-2 text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
