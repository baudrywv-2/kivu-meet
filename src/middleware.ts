import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/discovery/:path*',
    '/matches/:path*',
    '/chat/:path*',
    '/profile/:path*',
    '/settings/:path*',
    '/who-liked/:path*',
    '/confessions/:path*',
    '/onboarding/:path*',
    '/admin/:path*',
  ],
};
