-- ============================================
-- KIVU MEET - Initial Database Schema
-- PostgreSQL for Supabase
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- ENUMS
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('user', 'admin', 'moderator');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'subscription_tier') THEN
    CREATE TYPE subscription_tier AS ENUM ('free', 'premium');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_status') THEN
    CREATE TYPE report_status AS ENUM ('pending', 'reviewed', 'resolved', 'dismissed');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'report_type') THEN
    CREATE TYPE report_type AS ENUM ('user', 'confession', 'message');
  END IF;
END $$;

-- ============================================
-- USERS (extends auth.users)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  phone TEXT UNIQUE,
  name TEXT NOT NULL,
  age INTEGER CHECK (age >= 18 AND age <= 120),
  city TEXT NOT NULL,
  bio TEXT,
  interests TEXT[] DEFAULT '{}',
  voice_intro_url TEXT,
  avatar_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  last_location_updated_at TIMESTAMPTZ,
  relationship_goal TEXT,
  role user_role DEFAULT 'user',
  subscription_tier subscription_tier DEFAULT 'free',
  profile_boosted_until TIMESTAMPTZ,
  is_visible BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for profiles
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_visible ON profiles(is_visible) WHERE is_visible = true;
CREATE INDEX IF NOT EXISTS idx_profiles_boost ON profiles(profile_boosted_until) WHERE profile_boosted_until IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_lat_lng ON profiles(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- ============================================
-- LIKES (swipe right)
-- ============================================

CREATE TABLE IF NOT EXISTS public.likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  liker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  liked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  is_super_like BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(liker_id, liked_id)
);

CREATE INDEX IF NOT EXISTS idx_likes_liker ON likes(liker_id);
CREATE INDEX IF NOT EXISTS idx_likes_liked ON likes(liked_id);
CREATE INDEX IF NOT EXISTS idx_likes_created ON likes(created_at);

-- ============================================
-- MATCHES (mutual likes)
-- ============================================

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_a_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_b_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id)
);

CREATE INDEX IF NOT EXISTS idx_matches_user_a ON matches(user_a_id);
CREATE INDEX IF NOT EXISTS idx_matches_user_b ON matches(user_b_id);
CREATE INDEX IF NOT EXISTS idx_matches_created ON matches(created_at);

-- ============================================
-- MESSAGES (chat)
-- ============================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(match_id, created_at DESC);

-- ============================================
-- CONFESSIONS (anonymous feed)
-- ============================================

CREATE TABLE IF NOT EXISTS public.confessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  city TEXT NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_removed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_confessions_city ON confessions(city);
CREATE INDEX IF NOT EXISTS idx_confessions_created ON confessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_confessions_active ON confessions(city, created_at DESC) WHERE is_removed = false;

-- Confession likes (anonymous - no user link for true anonymity, or optional user for "like once")
CREATE TABLE IF NOT EXISTS public.confession_likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(confession_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_confession_likes_confession ON confession_likes(confession_id);

-- Confession comments (can be anonymous or signed)
CREATE TABLE IF NOT EXISTS public.confession_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  confession_id UUID NOT NULL REFERENCES public.confessions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  is_anonymous BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_confession_comments_confession ON confession_comments(confession_id);

-- ============================================
-- REPORTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  report_type report_type NOT NULL,
  target_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_confession_id UUID REFERENCES public.confessions(id) ON DELETE SET NULL,
  target_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  reason TEXT,
  status report_status DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_created ON reports(created_at DESC);

-- ============================================
-- BLOCKED USERS
-- ============================================

CREATE TABLE IF NOT EXISTS public.blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_id);

-- ============================================
-- WHO LIKED YOU (premium feature - denormalized for quick access)
-- ============================================

-- Uses likes table; premium users can query likes where liked_id = current_user

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.confession_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blocked_users ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all visible profiles, update own
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (is_visible = true OR id = auth.uid());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- Likes: users can manage own likes
DROP POLICY IF EXISTS "Users can manage own likes" ON public.likes;
CREATE POLICY "Users can manage own likes" ON public.likes
  FOR ALL USING (liker_id = auth.uid());

DROP POLICY IF EXISTS "Users can see likes where they are liked" ON public.likes;
CREATE POLICY "Users can see likes where they are liked" ON public.likes
  FOR SELECT USING (liked_id = auth.uid());

-- Matches: participants can read
DROP POLICY IF EXISTS "Match participants can read" ON public.matches;
CREATE POLICY "Match participants can read" ON public.matches
  FOR SELECT USING (user_a_id = auth.uid() OR user_b_id = auth.uid());

-- Messages: match participants can read/write
DROP POLICY IF EXISTS "Match participants can manage messages" ON public.messages;
CREATE POLICY "Match participants can manage messages" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.matches m
      WHERE m.id = match_id AND (m.user_a_id = auth.uid() OR m.user_b_id = auth.uid())
    )
  );

-- Confessions: anyone can read, insert (no user link for anonymity)
DROP POLICY IF EXISTS "Confessions are viewable by all" ON public.confessions;
CREATE POLICY "Confessions are viewable by all" ON public.confessions
  FOR SELECT USING (is_removed = false);

DROP POLICY IF EXISTS "Authenticated users can post confessions" ON public.confessions;
CREATE POLICY "Authenticated users can post confessions" ON public.confessions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Confession likes/comments
DROP POLICY IF EXISTS "Users can manage confession likes" ON public.confession_likes;
CREATE POLICY "Users can manage confession likes" ON public.confession_likes
  FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can manage confession comments" ON public.confession_comments;
CREATE POLICY "Users can manage confession comments" ON public.confession_comments
  FOR ALL USING (user_id = auth.uid() OR user_id IS NULL);

-- Reports: users can create, admins can manage
DROP POLICY IF EXISTS "Users can create reports" ON public.reports;
CREATE POLICY "Users can create reports" ON public.reports
  FOR INSERT WITH CHECK (reporter_id = auth.uid());

DROP POLICY IF EXISTS "Users can view own reports" ON public.reports;
CREATE POLICY "Users can view own reports" ON public.reports
  FOR SELECT USING (reporter_id = auth.uid());

-- Blocked users
DROP POLICY IF EXISTS "Users can manage own blocks" ON public.blocked_users;
CREATE POLICY "Users can manage own blocks" ON public.blocked_users
  FOR ALL USING (blocker_id = auth.uid());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-create match on mutual like
CREATE OR REPLACE FUNCTION create_match_on_mutual_like()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.likes
    WHERE liker_id = NEW.liked_id AND liked_id = NEW.liker_id
  ) THEN
    INSERT INTO public.matches (user_a_id, user_b_id)
    VALUES (
      LEAST(NEW.liker_id, NEW.liked_id),
      GREATEST(NEW.liker_id, NEW.liked_id)
    )
    ON CONFLICT (user_a_id, user_b_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_create_match ON public.likes;
CREATE TRIGGER trigger_create_match
  AFTER INSERT ON public.likes
  FOR EACH ROW
  EXECUTE FUNCTION create_match_on_mutual_like();

-- Update confession likes count
CREATE OR REPLACE FUNCTION update_confession_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.confessions SET likes_count = likes_count + 1 WHERE id = NEW.confession_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.confessions SET likes_count = likes_count - 1 WHERE id = OLD.confession_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_confession_likes_count ON public.confession_likes;
CREATE TRIGGER trigger_confession_likes_count
  AFTER INSERT OR DELETE ON public.confession_likes
  FOR EACH ROW
  EXECUTE FUNCTION update_confession_likes_count();

-- Update confession comments count
CREATE OR REPLACE FUNCTION update_confession_comments_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.confessions SET comments_count = comments_count + 1 WHERE id = NEW.confession_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.confessions SET comments_count = comments_count - 1 WHERE id = OLD.confession_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_confession_comments_count ON public.confession_comments;
CREATE TRIGGER trigger_confession_comments_count
  AFTER INSERT OR DELETE ON public.confession_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_confession_comments_count();

-- Updated_at trigger for profiles
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
