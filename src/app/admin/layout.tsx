import { createClient } from '@/lib/supabase/server';
import { t } from '@/lib/i18n';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'moderator') {
    redirect('/discovery');
  }

  const locale: 'en' | 'fr' | 'sw' | 'ln' = (user.user_metadata?.locale ?? 'en') as any;

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="border-b border-zinc-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-rose-600">Admin</h1>
          <Link href="/discovery" className="text-sm text-zinc-500 hover:text-rose-600">
            ← {t(locale, 'backToHome')}
          </Link>
        </div>
        <nav className="mt-2 flex gap-4 text-sm">
          <Link href="/admin" className="text-zinc-600 hover:text-rose-600">Users</Link>
          <Link href="/admin/reports" className="text-zinc-600 hover:text-rose-600">Reports</Link>
          <Link href="/admin/verification" className="text-zinc-600 hover:text-rose-600">Verification</Link>
          <Link href="/admin/confessions" className="text-zinc-600 hover:text-rose-600">Confessions</Link>
        </nav>
      </header>
      <main className="p-4">{children}</main>
    </div>
  );
}
