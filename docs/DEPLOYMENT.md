# Kivu Meet - Deployment Guide

## Prerequisites

- GitHub account
- Vercel account
- Supabase account
- Node.js 18+

---

## Step 1: Initialize GitHub Repository

```bash
cd "d:\Creator Mode\Kivu -meet"
git init
git add .
git commit -m "Initial commit: Kivu Meet MVP"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/kivu-meet.git
git push -u origin main
```

---

## Step 2: Connect Repository to Vercel

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **Add New** → **Project**
3. Import your GitHub repository `kivu-meet`
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (leave default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next` (default)

5. **Do not deploy yet** – add environment variables first (Step 4)

---

## Step 3: Configure Supabase Project

1. Go to [supabase.com](https://supabase.com) → **New Project**
2. Name: `kivu-meet`, set password, choose region (e.g. `eu-west-1`)
3. Wait for project to be ready

### Run migrations (in order)

1. In Supabase Dashboard → **SQL Editor**, run each file in order:
   - `001_initial_schema.sql`
   - `002_admin_policies.sql`
   - `003_storage_avatars.sql`
   - `004_unmatch_policy.sql`
   - `005_storage_voice_intros.sql`

### Enable Auth providers

1. **Authentication** → **Providers**
2. Enable **Email** (default)
3. (Optional) Enable **Phone** for OTP
4. Under **URL Configuration**, add:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/auth/callback`

### Storage buckets

Buckets `avatars` and `voice-intros` are created by migrations 003 and 005. If you create them manually instead: **Storage** → **New bucket** → name (e.g. `avatars`), set Public: Yes.

### Enable Realtime

1. **Database** → **Replication**
2. Enable replication for: `messages`, `matches`, `confessions`, `confession_likes`

---

## Step 4: Environment Variables

### Supabase

1. Supabase Dashboard → **Settings** → **API**
2. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Vercel

1. Project → **Settings** → **Environment Variables**
2. Add:

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon key |
| `NEXT_PUBLIC_SITE_URL` | `https://your-app.vercel.app` |

---

## Step 5: Production Deployment

1. In Vercel, click **Deploy**
2. Wait for build to complete
3. Visit your deployment URL

### Create first admin user

1. Sign up normally
2. In Supabase Dashboard → **SQL Editor**, run:

```sql
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'your-admin-email@example.com';
```

---

## Local Development

```bash
npm install
cp .env.example .env.local
# Fill in .env.local with Supabase credentials
npm run dev
```

Create `.env.example`:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```
