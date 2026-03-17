# Monitoring & Push Notifications

## Error tracking (Sentry)

The app’s **global Error Boundary** (`src/components/ErrorBoundary.tsx`) catches React errors and shows a fallback UI. After you install Sentry, you can add `Sentry.captureException(error, { extra: { componentStack: info.componentStack } })` in `componentDidCatch` so those errors are reported (see the comment in that file).

To capture production errors and performance:

1. **Create a Sentry project** at [sentry.io](https://sentry.io) for your Next.js app.

2. **Install Sentry:**
   ```bash
   npx @sentry/nextjs@latest
   ```
   Follow the wizard (DSN, project name). It will add `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`, and wrap your `next.config` with `withSentryConfig`.

3. **Environment variables** (in Vercel or `.env.local`):
   - `SENTRY_DSN` – from your Sentry project settings.
   - `SENTRY_AUTH_TOKEN` (optional) – for source maps upload on build.

4. **Verify:** Trigger an error in production; it should appear in the Sentry dashboard. The app already has a global **Error Boundary**; Sentry will capture uncaught errors and promise rejections when integrated.

---

## Push notifications (triggering from the backend)

You already have:

- **Push registration:** `POST /api/push/register` stores the subscription.
- **Push send:** `POST /api/push/send` accepts `{ userId, title, body, url? }` and sends to all devices for that user.

To send a push when something happens (e.g. new match, new message), call the send API from your backend when the event occurs.

### Option A: Supabase Database Webhooks

1. In **Supabase Dashboard → Database → Webhooks**, create a webhook:
   - **Table:** `matches` (or `messages`)
   - **Events:** Insert
   - **URL:** Your serverless function that calls the push send API (e.g. Vercel serverless or Supabase Edge Function).

2. The webhook payload includes `record` (the new row). From it you can get `user_a_id` / `user_b_id` (for matches) or `sender_id` / `match_id` (for messages), then resolve the recipient and call:
   ```bash
   curl -X POST https://your-app.vercel.app/api/push/send \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_PUSH_SEND_SECRET" \
     -d '{"userId":"<recipient-uuid>","title":"New match!","body":"You have a new match. Open the app to say hi.","url":"/matches"}'
   ```

### Option B: Supabase Edge Function

Create an Edge Function that subscribes to Realtime or is invoked by a trigger:

- On `matches` INSERT: get the two user IDs, for each user call your push API (or use `web-push` inside the Edge Function with VAPID keys) to send “You have a new match!”.
- On `messages` INSERT: get `match_id` and `sender_id`, resolve the other participant from `matches`, then send “New message from …” to that user.

### Option C: Vercel serverless (cron or called from app)

If you don’t use webhooks, you can have a serverless route that your **server actions** call after creating a match or message (e.g. `await fetch('/api/push/send', { method: 'POST', body: JSON.stringify({ userId, title, body, url }) })` with a secret header). Keep `PUSH_SEND_SECRET` and use it so only your backend can call the send API.

### Required env for push send

- `SUPABASE_SERVICE_ROLE_KEY` – to read `push_subscriptions` for the user.
- `VAPID_PRIVATE_KEY` – from `npx web-push generate-vapid-keys`.
- `PUSH_SEND_SECRET` (optional) – shared secret for `Authorization: Bearer <secret>` on `POST /api/push/send`.

See **README.md** (Web Push section) for subscription setup and migration `007_push_subscriptions.sql`.
