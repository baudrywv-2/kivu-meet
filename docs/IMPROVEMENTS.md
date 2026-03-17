# What else to improve

Prioritized list of improvements beyond the current implementation. Pick by impact and effort.

---

## Quick wins

| Improvement | What to do |
|-------------|------------|
| **Report toast copy** | Chat and Confessions still show extra “We’ll look into it.” after the i18n report message. Remove that so only `t('reportFeedback')` is shown. |
| **Confessions report toast i18n** | Use `{t('reportFeedback')}` in the confessions report toast (and remove any duplicate English text). |
| **Dark mode on empty states** | Empty state card is now always white; optionally add a soft dark variant (e.g. `dark:bg-zinc-100`) so it fits dark theme without going black. |

---

## UX & copy

| Improvement | What to do |
|-------------|------------|
| **Consistent back labels** | Some screens use “← Back”, others “← Discovery” etc.; align with `t('back')` and context (e.g. “Back to matches”). |
| **Confessions / Who-liked headings** | Use i18n for “Confessions”, “Who liked you”, “Discovery” in headers. |
| **Form validation messages** | Use i18n keys for “Please select a photo”, “Max size 5 MB”, etc. in verification and upload flows. |
| **Premium page** | Replace “Premium is coming soon” with real pricing or a waitlist when ready. |

---

## Reliability & errors

| Improvement | What to do |
|-------------|------------|
| **Retry on load failure** | Ensure Discovery, Matches, and Chat use `ErrorState` with “Try again” that refetches (not only discovery). |
| **Offline message** | When send fails (e.g. offline), show “Message not sent. Tap to retry.” and allow retry. |
| **Push failure handling** | If `/api/push/send` fails in swipe/chat, log or ignore; avoid blocking the main action. |

---

## Accessibility

| Improvement | What to do |
|-------------|------------|
| **Match modal focus** | When the “It’s a match!” modal opens, move focus to the first button (Send message) and trap focus until closed. |
| **Filters modal** | Same for Discovery filters: focus first control, trap focus, restore on close. |
| **Icon-only buttons** | Add `aria-label` to all icon-only buttons (e.g. ⋮ menu, pass/like/super-like if not already). |
| **Live region for toasts** | Keep `role="status"` on report/feedback toasts so screen readers announce them. |

---

## Performance

| Improvement | What to do |
|-------------|------------|
| **Lazy heavy routes** | `next/dynamic` for Who-liked, Confessions, Admin so they’re not in the main bundle. |
| **Image sizes** | Review `sizes` on all `Image` components for mobile/desktop to avoid loading too large images. |
| **Prefetch matches/chat** | Prefetch `/matches` and possibly first chat when user is on Discovery. |

---

## Security & data

| Improvement | What to do |
|-------------|------------|
| **Block list in who-liked** | Exclude blocked users from “who liked you” list (filter by `blocked_users`). |
| **Verification manual review** | Add `verification_status` and optional admin UI to approve/reject instead of auto-approve. |
| **Rate limit messaging** | Show a clear, i18n message when rate limited (e.g. “Too many messages. Try again in a minute.”). |

---

## Tests & CI

| Improvement | What to do |
|-------------|------------|
| **E2E critical path** | One Playwright test: login → onboarding (or skip) → discovery → like → match modal → open chat → send message. |
| **Unit tests** | Matching algorithm, i18n `t()`, or key server actions (e.g. likeUser, sendMessage) with mocks. |
| **CI** | Run lint + typecheck + E2E on push/PR. |

---

## Product

| Improvement | What to do |
|-------------|------------|
| **Premium subscription** | Integrate Stripe (or local payment) for `subscription_tier`; gate who-liked, super likes, rewinds. |
| **Push prompt timing** | Ask for notification permission after first match instead of on first load (higher opt-in). |
| **Localized push body** | Store user locale and send push in their language (e.g. “Nouveau match !” for French). |

Use this list to choose the next improvements; the implementation plan (Phase 6) has more detail on verification, push, and quality.
