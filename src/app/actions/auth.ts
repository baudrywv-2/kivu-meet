'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export async function signUpWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { success: true, message: 'Check your email for the verification link.' };
}

function safeRedirectPath(path: unknown): string {
  if (!path || typeof path !== 'string') return '/';
  const p = path.trim();
  if (!p.startsWith('/') || p.startsWith('//')) return '/';
  return p;
}

export async function signInWithEmail(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) return { error: error.message };
  redirect(safeRedirectPath(formData.get('redirect')));
}

export async function resendConfirmationEmail(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });
  if (error) return { error: error.message };
  return { success: true, message: 'Confirmation email sent. Please check your inbox.' };
}

export async function resetPasswordForEmail(email: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
  });
  if (error) return { error: error.message };
  return { success: true, message: 'Check your email for the reset link.' };
}

export async function signInWithOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback` },
  });

  if (error) return { error: error.message };
  return { success: true, message: 'Check your email for the login link.' };
}

export async function signInWithPhoneOtp(phone: string) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    phone: phone.startsWith('+') ? phone : `+243${phone.replace(/\D/g, '')}`,
  });

  if (error) return { error: error.message };
  return { success: true, message: 'Check your phone for the OTP.' };
}

export async function verifyOtp(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get('email') as string;
  const token = formData.get('token') as string;

  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'email',
  });

  if (error) return { error: error.message };
  redirect('/onboarding');
}

export async function verifyPhoneOtp(phone: string, token: string) {
  const supabase = await createClient();
  const normalized = phone.startsWith('+') ? phone : `+243${phone.replace(/\D/g, '')}`;

  const { error } = await supabase.auth.verifyOtp({
    phone: normalized,
    token,
    type: 'sms',
  });

  if (error) return { error: error.message };
  redirect('/onboarding');
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
