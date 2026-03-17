'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types/database';

const BOOST_MINUTES = 30;

export default function AdminUsersPage() {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      setUsers(data ?? []);
      setLoading(false);
    }
    load();
  }, [supabase]);

  async function deleteUser(id: string) {
    if (!confirm('Delete this user? This cannot be undone.')) return;
    await supabase.from('profiles').delete().eq('id', id);
    setUsers((prev) => prev.filter((u) => u.id !== id));
  }

  async function setTier(id: string, tier: 'free' | 'premium') {
    setUpdating(id);
    await supabase.from('profiles').update({ subscription_tier: tier }).eq('id', id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, subscription_tier: tier } : u)));
    setUpdating(null);
  }

  async function grantBoost(id: string) {
    setUpdating(id);
    const until = new Date(Date.now() + BOOST_MINUTES * 60 * 1000).toISOString();
    await supabase.from('profiles').update({ profile_boosted_until: until }).eq('id', id);
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, profile_boosted_until: until } : u)));
    setUpdating(null);
  }

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Users</h2>
      {loading ? (
        <div className="text-zinc-500">Loading...</div>
      ) : (
        <div className="overflow-x-auto rounded-lg bg-white shadow">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-zinc-50">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Tier</th>
                <th className="px-4 py-3">Boost</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const boosted = u.profile_boosted_until && new Date(u.profile_boosted_until) > new Date();
                return (
                  <tr key={u.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{u.name}</td>
                    <td className="px-4 py-3">{u.email ?? u.phone ?? '-'}</td>
                    <td className="px-4 py-3">{u.city}</td>
                    <td className="px-4 py-3">
                      <select
                        value={u.subscription_tier}
                        onChange={(e) => setTier(u.id, e.target.value as 'free' | 'premium')}
                        disabled={updating === u.id}
                        className="rounded border border-zinc-200 px-2 py-1 text-xs"
                      >
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      {boosted ? (
                        <span className="text-xs text-amber-600">Boosted</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => grantBoost(u.id)}
                          disabled={updating === u.id}
                          className="rounded bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 hover:bg-amber-200 disabled:opacity-50"
                        >
                          {updating === u.id ? '…' : `Boost ${BOOST_MINUTES}m`}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteUser(u.id)}
                        className="text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
