'use client';

import { useState, useRef, useEffect } from 'react';
import { createOrUpdateProfile } from '@/app/actions/profile';
import { uploadAvatar, uploadVoiceIntro } from '@/app/actions/upload';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageSelector } from '@/components/LanguageSelector';
import Image from 'next/image';
import Link from 'next/link';
import { CITIES, INTERESTS, RELATIONSHIP_GOALS } from '@/lib/constants';

const STEP_KEYS = ['basics', 'aboutYou', 'voiceFinish'] as const;

export default function OnboardingPage() {
  const { t } = useLanguage();
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [voiceIntroUrl, setVoiceIntroUrl] = useState<string | null>(null);
  const [savedBasics, setSavedBasics] = useState<{ name: string; age: number; city: string } | null>(null);
  const [savedAbout, setSavedAbout] = useState<{ bio: string; relationship_goal: string | null } | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [voiceUploading, setVoiceUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const voiceInputRef = useRef<HTMLInputElement>(null);

  const STEPS_LENGTH = 3;
  const progress = (step / STEPS_LENGTH) * 100;

  useEffect(() => {
    // Save referral code if present
    try {
      const url = new URL(window.location.href);
      const ref = url.searchParams.get('ref');
      if (ref) localStorage.setItem('kivu-ref', ref);
    } catch {}
  }, []);

  const goalLabel = (v: string) => {
    const map: Record<string, string> = { '': t('goalSelect'), dating: t('goalDating'), friends: t('goalFriends'), serious: t('goalSerious'), casual: t('goalCasual') };
    return map[v] ?? v;
  };

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

  function validateStep1(form: HTMLFormElement): boolean {
    const name = (form.elements.namedItem('name') as HTMLInputElement)?.value?.trim();
    const age = parseInt((form.elements.namedItem('age') as HTMLInputElement)?.value || '0', 10);
    const city = (form.elements.namedItem('city') as HTMLSelectElement)?.value;
    if (!name) {
      setSubmitError(t('pleaseEnterName'));
      return false;
    }
    if (!age || age < 18 || age > 120) {
      setSubmitError(t('pleaseEnterAge'));
      return false;
    }
    if (!city) {
      setSubmitError(t('pleaseSelectCity'));
      return false;
    }
    if (!avatarUrl) {
      setSubmitError(t('pleaseAddPhoto'));
      return false;
    }
    setSubmitError(null);
    return true;
  }

  function validateStep2(): boolean {
    const bio = (document.querySelector('[name="bio"]') as HTMLTextAreaElement)?.value?.trim();
    if (!bio || bio.length < 20) {
      setSubmitError(t('pleaseAddBio'));
      return false;
    }
    if (interests.length === 0) {
      setSubmitError(t('pleaseSelectInterest'));
      return false;
    }
    setSubmitError(null);
    return true;
  }

  async function handleNext(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    const form = e.target as HTMLFormElement;

    if (step === 1) {
      if (!validateStep1(form)) return;
      const name = (form.elements.namedItem('name') as HTMLInputElement)?.value?.trim() || '';
      const age = parseInt((form.elements.namedItem('age') as HTMLInputElement)?.value || '0', 10);
      const city = (form.elements.namedItem('city') as HTMLSelectElement)?.value || '';
      setSavedBasics({ name, age, city });
      setStep(2);
      return;
    }
    if (step === 2) {
      if (!validateStep2()) return;
      const bio = (form.querySelector('[name="bio"]') as HTMLTextAreaElement)?.value?.trim() || '';
      const relationship_goal = (form.querySelector('[name="relationship_goal"]') as HTMLSelectElement)?.value || null;
      setSavedAbout({ bio, relationship_goal: relationship_goal || null });
      setStep(3);
      return;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    if (!savedBasics || !savedAbout) {
      setSubmitError(t('pleaseCompleteSteps'));
      return;
    }
    setSubmitting(true);
    const referrerId = (() => {
      try { return localStorage.getItem('kivu-ref'); } catch { return null; }
    })();
    const result = await createOrUpdateProfile({
      name: savedBasics.name,
      age: savedBasics.age >= 18 ? savedBasics.age : null,
      city: savedBasics.city,
      bio: savedAbout.bio || null,
      interests,
      relationship_goal: savedAbout.relationship_goal || null,
      avatar_url: avatarUrl,
      voice_intro_url: voiceIntroUrl,
      ...(referrerId ? ({ referrer_id: referrerId } as any) : {}),
    });
    setSubmitting(false);
    if (result?.error) setSubmitError(result.error);
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-10 border-b border-zinc-200 bg-white/95 px-3 py-2 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between">
          <Link href="/" className="text-xs text-zinc-500 hover:text-black">← {t('home')}</Link>
          <span className="text-xs font-medium text-zinc-600">{t('stepOf', { step: String(step), total: String(STEPS_LENGTH) })}</span>
          <LanguageSelector compact />
        </div>
        <div className="mx-auto mt-1.5 h-1 max-w-lg overflow-hidden rounded-full bg-zinc-200">
          <div
            className="h-full rounded-full bg-[#fffc00] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </header>

      <main className="mx-auto max-w-lg px-3 py-6 sm:px-4 sm:py-8">
        <h1 className="text-xl font-bold text-black">{t('createProfile')}</h1>
        <p className="mt-0.5 text-sm text-zinc-500">{t(STEP_KEYS[step - 1])}</p>

        {submitError && (
          <div className="mt-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-700">
            {submitError}
          </div>
        )}

        <form
          onSubmit={step < 3 ? handleNext : handleSubmit}
          className="mt-6 space-y-6"
          id="onboarding-form"
        >
          {/* Step 1: Basics */}
          {step === 1 && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">{t('profilePhoto')} *</label>
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
                  className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-white p-5 transition hover:border-[#fffc00]/60 hover:bg-[#fffc00]/5"
                >
                  {uploading ? (
                    <span className="text-xs text-zinc-500">{t('uploading')}</span>
                  ) : avatarUrl ? (
                    <>
                      <div className="relative h-24 w-24 overflow-hidden rounded-full">
                        <Image src={avatarUrl} alt="Avatar" fill className="object-cover" sizes="96px" />
                      </div>
                      <span className="text-xs text-black font-medium">{t('changePhoto')}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl text-zinc-400">📷</span>
                      <span className="text-xs text-zinc-500">{t('tapToAddPhoto')}</span>
                    </>
                  )}
                </button>
                {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Name *</label>
                <input name="name" required defaultValue={savedBasics?.name} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-[#fffc00] focus:outline-none" placeholder={t('yourName')} />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">Age *</label>
                <input name="age" type="number" min={18} max={120} required defaultValue={savedBasics?.age || ''} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-[#fffc00] focus:outline-none" placeholder="18+" />
                <p className="mt-0.5 text-[10px] text-zinc-400">{t('youMustBe18')}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">City *</label>
                <select name="city" required defaultValue={savedBasics?.city || ''} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-[#fffc00] focus:outline-none">
                  <option value="">{t('selectCity')}</option>
                  {CITIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </>
          )}

          {/* Step 2: About you */}
          {step === 2 && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">{t('bio')} *</label>
                <textarea name="bio" rows={3} required minLength={20} defaultValue={savedAbout?.bio} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-[#fffc00] focus:outline-none" placeholder={t('bioPlaceholder')} />
                <p className="mt-0.5 text-[10px] text-zinc-400">{t('bioHint')}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">{t('relationshipGoal')}</label>
                <select name="relationship_goal" defaultValue={savedAbout?.relationship_goal ?? ''} className="w-full rounded-lg border border-zinc-200 px-3 py-2.5 text-sm focus:border-[#fffc00] focus:outline-none">
                  {RELATIONSHIP_GOALS.map((g) => (
                    <option key={g.value || 'empty'} value={g.value}>{goalLabel(g.value)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-700">{t('interests')} * ({t('pickAtLeastOne')})</label>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInterest(i)}
                      className={`rounded-full px-3 py-1.5 text-xs transition ${
                        interests.includes(i) ? 'bg-[#fffc00] text-black font-medium' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Step 3: Voice & finish */}
          {step === 3 && (
            <>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-700">{t('voiceIntroOptional')}</label>
                <input
                  ref={voiceInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp4,audio/webm,audio/wav,audio/ogg"
                  onChange={handleVoiceChange}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => voiceInputRef.current?.click()}
                  className="flex w-full items-center gap-2 rounded-lg border-2 border-dashed border-zinc-300 bg-white p-3 text-left text-xs text-zinc-500 transition hover:border-[#fffc00]/60 hover:bg-[#fffc00]/5"
                >
                  {voiceUploading ? <span>{t('uploading')}</span> : voiceIntroUrl ? <span className="text-black font-medium">{t('voiceIntroAdded')}</span> : <span>{t('addVoiceIntro')}</span>}
                </button>
                {uploadError && <p className="mt-1 text-sm text-red-600">{uploadError}</p>}
              </div>
              <div className="rounded-lg border border-zinc-200 bg-white p-3">
                <h2 className="text-xs font-medium text-zinc-500">{t('review')}</h2>
                <p className="mt-1.5 text-xs text-zinc-700">
                  {t('reviewDesc')}
                </p>
              </div>
            </>
          )}

          <div className="flex gap-2 pt-4">
            {step > 1 ? (
              <button type="button" onClick={() => { setStep(step - 1); setSubmitError(null); }} className="rounded-lg border border-zinc-200 px-4 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                {t('back')}
              </button>
            ) : null}
            <button type="submit" disabled={submitting} className="flex-1 rounded-lg bg-[#fffc00] py-2.5 text-sm font-bold text-black transition hover:bg-[#e6e300] disabled:opacity-50">
              {submitting ? t('creating') : step < 3 ? t('next') : t('createProfile')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
