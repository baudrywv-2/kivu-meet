# Kivu Meet

A mobile-first social discovery and dating MVP optimized for African cities (Goma, Kinshasa, Bukavu).

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS
- **Backend**: Supabase (Auth, Database, Realtime, Storage)
- **Deployment**: Vercel

## Features

- **Auth**: Email signup, OTP verification
- **Profiles**: Photo, name, age, city, bio, interests, voice intro
- **Matching**: Swipe right (like), swipe left (pass), super like, mutual match
- **Chat**: Real-time messaging
- **Nearby Discovery**: City-based filtering
- **Confessions**: Anonymous feed per city with likes/comments
- **Safety**: Block, report, moderation
- **Premium**: Profile boost, see who liked you, super like
- **Admin**: Users, reports, confessions moderation

## Project Structure

```
├── docs/
│   ├── ARCHITECTURE.md
│   ├── MATCHING_ALGORITHM.md
│   ├── API_EXAMPLES.md
│   ├── UI_WIREFRAMES.md
│   └── DEPLOYMENT.md
├── supabase/migrations/
│   ├── 001_initial_schema.sql
│   └── 002_admin_policies.sql
├── src/
│   ├── app/
│   │   ├── actions/       # Server actions
│   │   ├── admin/         # Admin dashboard
│   │   ├── auth/         # Auth callback
│   │   ├── chat/         # Chat UI
│   │   ├── confessions/  # Confessions feed
│   │   ├── discovery/    # Swipe discovery
│   │   ├── login/        # Login page
│   │   ├── matches/      # Matches list
│   │   └── onboarding/   # Profile creation
│   ├── components/
│   ├── lib/
│   │   ├── matching/     # Match algorithm
│   │   └── supabase/     # Supabase clients
│   └── types/
└── package.json
```

## Quick Start

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Add NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SITE_URL
   ```

3. **Run Supabase migrations**
   - Create a Supabase project
   - Run `supabase/migrations/001_initial_schema.sql` and `002_admin_policies.sql` in SQL Editor

4. **Start dev server**
   ```bash
   npm run dev
   ```

## Testing

E2E tests use [Playwright](https://playwright.dev/).

```bash
# Install browsers (first time only; required before running tests)
npx playwright install

# Run E2E tests (starts dev server automatically)
npm run test:e2e

# Run with UI
npm run test:e2e:ui
```

Optional: set `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` to run the full-flow test (sign in → discovery/onboarding).

## PWA

The app includes a web manifest and **PWA icons** (`public/icon-192.png`, `public/icon-512.png`) so users can “Add to home screen.” Icons are generated with:

```bash
node scripts/generate-pwa-icons.js
```

Replace those PNGs with your own designs if you prefer.

### Web Push (optional)

For push notifications when the app is in the background (e.g. new match, new message):

1. Generate VAPID keys: `npx web-push generate-vapid-keys`
2. Set `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `.env.local`
3. Run migration `007_push_subscriptions.sql` so subscriptions can be stored
4. To send pushes from the server, install `web-push`, set `SUPABASE_SERVICE_ROLE_KEY` and optionally `PUSH_SEND_SECRET`, then call `POST /api/push/send` with `{ userId, title, body, url }` (e.g. from a Supabase Edge Function or webhook)

## Deployment

See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for step-by-step instructions.

## License

Private
