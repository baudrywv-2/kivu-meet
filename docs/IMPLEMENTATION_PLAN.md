# Kivu Meet – Implementation Plan

This document maps the product roadmap to the codebase so you can implement features in order. Priorities: **foundation first**, then **chat**, **feel**, **growth**, and **differentiation**.

---

## Current state (updated after full implementation)

| Area | Status | Notes |
|------|--------|--------|
| **Navigation** | ✅ Bottom nav | `BottomNav` on Discovery, Matches, Confessions, Profile. |
| **Skeletons** | ✅ Everywhere | Profile and Settings use `PageSkeleton`; Discovery, Matches, Confessions, Chat, Who-liked already had it. |
| **Pull-to-refresh** | ✅ | `PullToRefresh` on Discovery, Matches, Confessions. |
| **Dark mode** | ✅ | `ThemeContext`, CSS vars in `globals.css`, theme toggle in Settings (Light/Dark/System). |
| **Safety** | ✅ | Safety tips page at `/settings/safety`; link from Settings. |
| **Profile completeness** | ✅ | Progress bar + "Add voice intro" CTA on profile page. |
| **Who liked you** | ✅ | Paywall + blur preview for free users. |
| **Chat** | ✅ | Typing indicator (Supabase broadcast), read receipts (Seen), voice messages, photo in chat. |
| **Feel** | ✅ | Haptics on like/pass/super like; sound effects (match + new message) toggle in Settings. |
| **Growth** | ✅ | Icebreaker prompts on match profile; boost toast; rewind (undo pass) in Discovery. |
| **Differentiation** | ✅ | Voice on card (ProfileCard); rewind; localized "Active X ago" (formatRelativeTimeKey + i18n). |
| **Verification badge** | ✅ | `is_verified` on Profile; verification page at `/settings/verification`; badge on ProfileCard, profile, profile/[userId]. |
| **Micro-animations** | ✅ | Card exit left/right on pass/like (Discovery); message-tick for "Seen" in chat. |
| **Empty-state illustrations** | ✅ | EmptyState `illustration` prop: noMatches, noMessages, noConfessions (SVG); used on Matches, Chat, Confessions. |
| **Match reminder** | ✅ | Banner on Matches page: "You have X new matches – say hi!" linking to first unmessaged chat. |

---

## Phase 1 – Foundation (do first)

| Feature | What to do | Where in codebase |
|--------|------------|--------------------|
| **Bottom nav** | Sticky bottom bar: Discovery, Matches, Confessions, Profile. Show on these 4 routes only; hide on chat, settings, edit, who-liked. | New: `src/components/BottomNav.tsx`. Use in each of: `discovery/page.tsx`, `matches/page.tsx`, `confessions/page.tsx`, `profile/page.tsx` (and optionally in a shared layout for those routes). |
| **Skeletons everywhere** | Use `PageSkeleton` (or a small variant) while profile/settings load. | `src/app/profile/page.tsx`: replace loading div with `<PageSkeleton variant="centered" />`. `src/app/settings/page.tsx`: same. |
| **Pull-to-refresh** | Pull-down to refetch on Discovery, Matches, Confessions. | Add a refresh callback + pull detection (or a small wrapper) in `discovery/page.tsx`, `matches/page.tsx`, `confessions/page.tsx`. Reserve space at top so content doesn’t jump. |
| **Safety tips page** | New page with short “Stay safe” content (don’t share money, meet in public, etc.). Link from Settings. | New: `src/app/settings/safety/page.tsx` (or `src/app/safety/page.tsx`). In `src/app/settings/page.tsx` add link next to Blocked users / Terms. Add i18n keys in `src/lib/i18n.ts`. |
| **Profile completeness** | Progress bar (e.g. avatar + bio + voice intro + city = 4 items) and CTA “Add voice intro for more matches.” | `src/app/profile/page.tsx`: compute % (e.g. 25% per item), show progress bar; keep “Complete profile” banner; add explicit “Add voice intro” CTA if missing. Reuse `completeProfile` / `completeProfileDesc` or add `profileCompletePercent`, `addVoiceIntroCta`. |

---

## Phase 2 – Chat

| Feature | What to do | Where |
|--------|------------|--------|
| Typing indicator | “X is typing…” in chat | `src/app/chat/[matchId]/page.tsx`. Needs presence or a `typing` table/channel; optional Supabase realtime or short-lived row. |
| Read receipts | “Seen” / read state | Messages already have `read_at`. Expose in UI (e.g. double tick or “Seen” when `read_at` set). |
| Voice messages | Record and send voice clips (reuse voice intro pipeline) | Chat page + Supabase storage; same bucket as voice intro. New message type or `content` with URL. |
| Photo in chat | Send images in conversation | Storage + optional moderation; new message type or attachment table. |

---

## Phase 3 – Feel (UX polish)

| Feature | What to do | Where |
|--------|------------|--------|
| Dark mode | Theme toggle (system/manual), dark palette | `globals.css` + CSS variables for dark; theme provider or class on `html`; persist in localStorage. |
| Micro-animations | Card swipe direction, match pop, message tick, button press | Discovery cards, match modal, chat bubbles, buttons. |
| Haptics | Vibration on like/pass/super like (where supported) | `ProfileCard` or discovery page; `navigator.vibrate?.(pattern)`. |
| Empty-state illustrations | Illustrations for “No matches”, “No messages”, “No confessions” | Optional SVG/illustration in `EmptyState` or per-screen. |
| Sound effects | Optional sounds for match, new message (toggle in settings) | Settings toggle; play on match modal open / new message. |

---

## Phase 4 – Growth & retention

| Feature | What to do | Where |
|--------|------------|--------|
| Icebreaker prompts | “Ask about travel” etc. on match profile or first message | Match profile view or chat composer; static or from profile interests. |
| “Who liked you” paywall | Already implemented; optional blur list for free | `who-liked/page.tsx` already gates list; can add blur effect for free users. |
| Boost in UI | “Your profile was shown 2× more” after boost | Profile or a toast after calling `boostProfile`; use `profile_boosted_until`. |
| Match reminder | “You have 2 new matches – say hi!” | Push or in-app; use existing notification flow. |
| Profile completeness score | “Your profile is 80% complete” | Same as Phase 1 profile completeness; can refine copy. |

---

## Phase 5 – Differentiation

| Feature | What to do | Where |
|--------|------------|--------|
| Voice intro on card | Play from discovery card (small play button) | `ProfileCard` in `src/components/ProfileCard.tsx`; play `voice_intro_url` when present. |
| Rewind / Second look | Undo last pass (limited or premium) | Store last N passed IDs; “Undo” in discovery; restore to stack. |
| Verification badge | Selfie/ID verification, badge on profile | New verification flow + profile badge; DB field. |
| Localized dates | “Active 2 hours ago” in user language | Format `last_active` or `updated_at` with i18n. |

---

## Phase 6 – Verification, push, new features & quality

After Phases 1–5, use this phase to complete verification, enable push for match reminders, add selected new features, and improve quality.

### 6.1 Verification (full flow)

| Task | What to do | Where in codebase |
|------|------------|-------------------|
| **DB: `is_verified`** | Add column if missing: `profiles.is_verified boolean default false`. Optional: `verification_requests(id, user_id, selfie_url, status, reviewed_at)` for review queue. | Supabase migration or SQL. |
| **Selfie upload** | Upload selfie image (reuse avatar/chat pipeline). Store in Supabase Storage (e.g. `verification/{user_id}.jpg`). | New server action: `src/app/actions/verification.ts` (upload, optional insert into `verification_requests`). |
| **Verification page UI** | Replace “coming soon” with: file input for selfie, submit button, “Under review” state, success when `is_verified` is true. | `src/app/settings/verification/page.tsx`. |
| **Set verified (admin or auto)** | Server action or Edge Function: set `profiles.is_verified = true` after review (or simple auto-approve for MVP). | `src/app/actions/verification.ts` (e.g. `approveVerification(userId)`) or Supabase function; restrict to admin or cron. |
| **i18n** | Add keys: `verificationSubmit`, `verificationUnderReview`, `verificationRejected`. | `src/lib/i18n.ts` (en, fr, sw, ln). |

### 6.2 Push (match reminder & new message)

| Task | What to do | Where in codebase |
|------|------------|-------------------|
| **Push registration in app** | Ensure users are prompted to allow push (e.g. after first match or in Settings). Reuse `PushRegistration`; store subscription via `/api/push/register`. | `src/components/PushRegistration.tsx`, layout or Settings; `src/app/api/push/register/route.ts`. |
| **DB: push_subscriptions** | Table `push_subscriptions(user_id, endpoint, p256dh_key, auth_key, created_at)` if not present. | Supabase migration. |
| **Trigger: new match** | When a match is created (both users liked each other), call push send API for the *other* user: “You have a new match with {name}!” with `url: /matches` or `/chat/{matchId}`. | `src/app/actions/swipe.ts`: after `likeUser` returns `matched`, call `fetch('/api/push/send', { method: 'POST', body: { userId: otherUserId, title, body, url } })` with server-side secret, or use Supabase Edge Function/Database webhook. |
| **Trigger: new message (optional)** | On message insert, send push to the recipient: “{name}: {preview}” with `url: /chat/{matchId}`. | Same pattern: call push send from `src/app/actions/chat.ts` (sendMessage) or via DB webhook. |
| **Env** | Document `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `PUSH_SEND_SECRET`; optional `NEXT_PUBLIC_SITE_URL`. | `.env.example` or README. |

### 6.3 New features (pick as needed)

| Task | What to do | Where in codebase |
|------|------------|-------------------|
| **Premium / limits** | Gate “Who liked you” list, rewind count, or super-like count by `subscription_tier`. Show upgrade CTA. | `src/app/who-liked/page.tsx`, `src/app/discovery/page.tsx`, `src/app/actions/swipe.ts`; optional `src/app/premium/page.tsx`. |
| **Report feedback** | After report submit, show “We’ll review within 24h” and optional “View reported” in Settings. | `src/app/actions/safety.ts`, Settings or new `src/app/settings/reports/page.tsx`. |
| **Block list sync** | Ensure blocked users are excluded from discovery, who-liked, and matches. | `src/app/actions/swipe.ts`, who-liked, discovery (already partially done); centralize in one place if needed. |
| **Notifications settings** | Toggle “Match notifications” / “Message notifications” (store in profile or `user_preferences`). Respect when sending push. | `src/app/settings/page.tsx`; DB field or table; check in push send logic. |

### 6.4 Quality

| Task | What to do | Where in codebase |
|------|------------|-------------------|
| **Error handling & retry** | Add retry for critical loads (discovery, chat, matches). Clear error messages; “Try again” button where missing. | `src/app/discovery/page.tsx`, `src/app/chat/[matchId]/page.tsx`, `src/app/matches/page.tsx`; reuse `ErrorState`. |
| **Accessibility** | Focus management on modals (match, filters); `aria-label` on icon-only buttons; sufficient contrast (dark mode). | `ProfileCard.tsx`, discovery (filters, match modal), `BottomNav`, form labels. |
| **Performance** | Lazy-load heavy screens (e.g. who-liked, confessions); optimize images (sizes, priority); optional bundle analysis. | Next.js `dynamic()` for rarely used routes; `Image` `sizes` already used; `next/bundle-analyzer` in next.config. |
| **Tests** | E2E for: login → onboarding → discovery like → match → send message. Or unit tests for matching algo, i18n, key actions. | `e2e/` (Playwright) or `**/*.test.ts`; CI step. |

---

## Quick reference – key files

| Purpose | Path |
|--------|------|
| Root layout | `src/app/layout.tsx` |
| Discovery | `src/app/discovery/page.tsx` |
| Matches | `src/app/matches/page.tsx` |
| Confessions | `src/app/confessions/page.tsx` |
| Profile (own) | `src/app/profile/page.tsx` |
| Profile edit | `src/app/profile/edit/page.tsx` |
| Settings | `src/app/settings/page.tsx` |
| Who-liked (paywall) | `src/app/who-liked/page.tsx` |
| Chat | `src/app/chat/[matchId]/page.tsx` |
| Page skeleton | `src/components/PageSkeleton.tsx` |
| Empty state | `src/components/EmptyState.tsx` |
| i18n | `src/lib/i18n.ts` |
| Safety actions | `src/app/actions/safety.ts` |
| Database types | `src/types/database.ts` |
| Verification page | `src/app/settings/verification/page.tsx` |
| Push send API | `src/app/api/push/send/route.ts` |
| Push register API | `src/app/api/push/register/route.ts` |
| Push helpers | `src/lib/push.ts` |

---

## Suggested order to implement (Phase 1)

1. **Bottom nav** – one component, then add to Discovery, Matches, Confessions, Profile.
2. **Safety tips page** – new route + link from Settings + i18n.
3. **Profile completeness** – progress % + “Add voice intro” CTA on profile page.
4. **Pull-to-refresh** – Discovery, then Matches, then Confessions.
5. **Skeletons on Profile and Settings** – swap loading div for `PageSkeleton`.

After Phase 1, pick Phase 2 (chat) or Phase 3 (feel) based on whether you want to prioritize **engagement** (chat features) or **polish** (dark mode, animations).

---

## Suggested order to implement (Phase 6)

1. **6.1 Verification** – DB column `profiles.is_verified`; selfie upload action + storage; verification page UI (submit, under review, verified); optional admin approve or auto-approve; i18n.
2. **6.2 Push** – Ensure `push_subscriptions` table and register API work; surface `PushRegistration` in app (Settings or after first match); from `likeUser` when `matched`, call push send for the other user (“New match with …”); optional new-message push; document env vars.
3. **6.3 New features** – Pick one or more: premium/limits (who-liked, rewind, super-like), report feedback, notification toggles.
4. **6.4 Quality** – Error handling and retry on discovery/chat/matches; a11y (focus, labels); perf (lazy routes, images); E2E or unit tests for critical path.
