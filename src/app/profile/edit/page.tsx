'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { updateProfile } from '@/app/actions/profile';
import { uploadAvatar, uploadVoiceIntro } from '@/app/actions/upload';
import { getSignedUrlForRef } from '@/app/actions/media';
import Image from 'next/image';
import Link from 'next/link';
import { CITIES, INTERESTS, RELATIONSHIP_GOALS } from '@/lib/constants';
import type { Profile } from '@/types/database';
import { isStorageRef } from '@/lib/storageRef';
import { useLanguage } from '@/contexts/LanguageContext';

export default function EditProfilePage() {
  const { t } = useLanguage();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [voiceIntroUrl, setVoiceIntroUrl] = useState<string | null>(null);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = '/login';
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (data) {
        setProfile(data as Profile);
        setAvatarUrl(data.avatar_url ?? null);
        setVoiceIntroUrl(data.voice_intro_url ?? null);
        setInterests(data.interests ?? []);
      }
    }
    load();
  }, [supabase]);

  useEffect(() => {
    let cancelled = false;
    async function resolve() {
      if (!voiceIntroUrl) {
        setVoicePreviewUrl(null);
        return;
      }
      if (!isStorageRef(voiceIntroUrl)) {
        setVoicePreviewUrl(voiceIntroUrl);
        return;
      }
      const res = await getSignedUrlForRef(voiceIntroUrl);
      if (!cancelled) setVoicePreviewUrl(res.url ?? null);
    }
    resolve();
    return () => {
      cancelled = true;
    };
  }, [voiceIntroUrl]);

  function toggleInterest(interest: string) {
    setInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const formData = new FormData();
    formData.set('file', file);
    const result = await uploadAvatar(formData);
    setUploading(false);
    if (result.error) setUploadError(result.error);
    else if (result.url) setAvatarUrl(result.url);
  }

  async function handleVoiceChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);
    setVoiceUploading(true);
    const formData = new FormData();
    formData.set('file', file);
    const result = await uploadVoiceIntro(formData);
    setVoiceUploading(false);
    if (result.error) setUploadError(result.error);
    else if (result.ref) setVoiceIntroUrl(result.ref);
  }

  async function handleSubmit(formData: FormData) {
    setMessage(null);
    setSaving(true);
    const result = await updateProfile({
      name: formData.get('name') as string,
      age: parseInt(formData.get('age') as string) || null,
      city: formData.get('city') as string,
      bio: (formData.get('bio') as string) || null,
      interests,
      relationship_goal: (formData.get('relationship_goal') as string) || null,
      avatar_url: avatarUrl,
      voice_intro_url: voiceIntroUrl,
    });
    setSaving(false);
    if (result?.error) setMessage({ type: 'error', text: result.error });
    else setMessage({ type: 'success', text: 'Profile updated.' });
  }

  if (!profile) return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50 to-amber-50 p-4">
      <div className="mx-auto max-w-lg py-8">
        <Link href="/profile" className="text-sm text-rose-600 hover:underline">← Profile</Link>
        <h1 className="mt-2 text-2xl font-bold text-rose-600">Edit profile</h1>
        <p className="mb-6 text-zinc-500">Update your info</p>

        {message && (
          <div
            className={`mb-4 rounded-lg p-3 text-sm ${
              message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Profile photo</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={handleAvatarChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-2 rounded-xl border-2 border-dashed border-zinc-300 bg-white p-6 transition hover:border-rose-300"
            >
              {uploading ? (
                <span className="text-sm text-zinc-500">Uploading...</span>
              ) : avatarUrl ? (
                <>
                  <div className="relative h-24 w-24 overflow-hidden rounded-full">
                    <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="96px" />
                  </div>
                  <span className="text-sm text-rose-600">Change photo</span>
                </>
              ) : (
                <>
                  <span className="text-3xl text-zinc-400">📷</span>
                  <span className="text-sm text-zinc-500">Tap to add a photo</span>
                </>
              )}
            </button>
            {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Voice intro</label>
            <input ref={voiceInputRef} type="file" accept="audio/mpeg,audio/mp4,audio/webm,audio/wav,audio/ogg" onChange={handleVoiceChange} className="hidden" />
            <button type="button" onClick={() => voiceInputRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border-2 border-dashed border-zinc-300 bg-white p-4 transition hover:border-rose-300">
              {voiceUploading ? <span className="text-sm text-zinc-500">Uploading...</span> : voiceIntroUrl ? (
                <> <span className="text-2xl">🔊</span> <span className="text-sm text-rose-600">{t('voiceIntroAdded')}</span> </>
              ) : (
                <> <span className="text-2xl text-zinc-400">🎤</span> <span className="text-sm text-zinc-500">{t('addVoiceIntro')}</span> </>
              )}
            </button>
            {voicePreviewUrl && (
              <audio controls src={voicePreviewUrl} className="mt-2 w-full" />
            )}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Name</label>
            <input
              name="name"
              required
              defaultValue={profile.name}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 focus:border-rose-400 focus:outline-none"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Age</label>
            <input
              name="age"
              type="number"
              min={18}
              max={120}
              defaultValue={profile.age ?? ''}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 focus:border-rose-400 focus:outline-none"
              placeholder="18+"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">City</label>
            <select
              name="city"
              required
              defaultValue={profile.city}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 focus:border-rose-400 focus:outline-none"
            >
              {CITIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Bio</label>
            <textarea
              name="bio"
              rows={3}
              maxLength={500}
              defaultValue={profile.bio ?? ''}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 focus:border-rose-400 focus:outline-none"
              placeholder="A short bio (max 500 characters)"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">Relationship goal</label>
            <select
              name="relationship_goal"
              defaultValue={profile.relationship_goal ?? ''}
              className="w-full rounded-xl border border-zinc-200 px-4 py-3 focus:border-rose-400 focus:outline-none"
            >
              {RELATIONSHIP_GOALS.map((g) => (
                <option key={g.value || 'empty'} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700">Interests</label>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggleInterest(i)}
                  className={`rounded-full px-4 py-2 text-sm transition ${
                    interests.includes(i) ? 'bg-rose-500 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl bg-rose-500 py-3 font-medium text-white transition hover:bg-rose-600 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </form>
      </div>
    </div>
  );
}
