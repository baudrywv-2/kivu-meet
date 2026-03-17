'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import type { Report } from '@/types/database';

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<Report['status'] | 'all'>('pending');
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      let query = supabase.from('reports').select('*').order('created_at', { ascending: false });
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data } = await query;
      setReports(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase, statusFilter]);

  async function updateStatus(id: string, status: Report['status']) {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase
      .from('reports')
      .update({
        status,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', id);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Reports</h2>
      <div className="mb-4 flex gap-2">
        {(['pending', 'reviewed', 'resolved', 'dismissed', 'all'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded px-3 py-1.5 text-sm ${statusFilter === s ? 'bg-rose-500 text-white' : 'bg-zinc-200 text-zinc-700 hover:bg-zinc-300'}`}
          >
            {s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : reports.length === 0 ? (
        <div className="rounded-lg bg-white p-8 text-center text-zinc-500">
          No reports {statusFilter !== 'all' ? `with status "${statusFilter}"` : ''}
        </div>
      ) : (
        <div className="space-y-4">
          {reports.map((r) => (
            <div
              key={r.id}
              className="rounded-lg bg-white p-4 shadow"
            >
              <p><strong>Type:</strong> {r.report_type}</p>
              <p><strong>Status:</strong> {r.status}</p>
              <p><strong>Reason:</strong> {r.reason ?? '-'}</p>
              {r.target_user_id && (
                <p><strong>Target user:</strong> <Link href={`/profile/${r.target_user_id}`} className="text-rose-600 hover:underline">View profile</Link></p>
              )}
              {r.target_confession_id && (
                <p><strong>Confession:</strong> <Link href={`/confessions?highlight=${r.target_confession_id}`} className="text-rose-600 hover:underline">View confession</Link> ({r.target_confession_id})</p>
              )}
              {r.target_message_id && <p><strong>Message ID:</strong> {r.target_message_id}</p>}
              <p className="text-sm text-zinc-500">
                {new Date(r.created_at).toLocaleString()}
              </p>
              {r.status === 'pending' && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    onClick={() => updateStatus(r.id, 'reviewed')}
                    className="rounded bg-amber-500 px-3 py-1 text-white hover:bg-amber-600"
                  >
                    Mark reviewed
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, 'resolved')}
                    className="rounded bg-green-500 px-3 py-1 text-white hover:bg-green-600"
                  >
                    Resolve
                  </button>
                  <button
                    onClick={() => updateStatus(r.id, 'dismissed')}
                    className="rounded bg-zinc-300 px-3 py-1 hover:bg-zinc-400"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
