# Kivu Meet - System Architecture

## Overview

Kivu Meet is a mobile-first social discovery and dating MVP optimized for African cities (Goma, Kinshasa, Bukavu). The app enables nearby discovery, matching, real-time chat, and an anonymous confessions feed.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router), React, Tailwind CSS |
| Backend | Supabase (Auth, Database, Realtime, Storage) |
| Database | PostgreSQL (Supabase) |
| Deployment | Vercel |
| Version Control | GitHub |

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Vercel (Edge)                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              Next.js App (SSR + Client)                    │  │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────┐  │  │
│  │  │  Auth   │ │ Discovery│ │  Chat   │ │ Confessions     │  │  │
│  │  │  Pages  │ │  Swipe   │ │  Real-  │ │ Feed           │  │  │
│  │  └─────────┘ └─────────┘ │  time   │ └─────────────────┘  │  │
│  │                          └─────────┘                       │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Supabase Cloud                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐ │
│  │ Auth        │ │ PostgreSQL  │ │ Realtime    │ │ Storage    │ │
│  │ (Email/OTP) │ │ + RLS       │ │ (WebSocket) │ │ (Photos)   │ │
│  └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

1. **Authentication**: Supabase Auth → JWT → RLS policies
2. **Discovery**: Geo query → Match algorithm → Ranked profiles
3. **Matching**: Like → Check mutual → Create match → Realtime notification
4. **Chat**: Message insert → Realtime broadcast → Notification
5. **Confessions**: Anonymous insert → City filter → Realtime feed

## Security Model

- **Row Level Security (RLS)** on all tables
- Users can only read/write their own data or permitted shared data (matches, messages)
- Anonymous confessions: no user_id stored, city-only association
- Blocked users filtered at query level
