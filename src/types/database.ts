export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Profile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  age: number | null;
  city: string;
  bio: string | null;
  interests: string[];
  voice_intro_url: string | null;
  avatar_url: string | null;
  latitude: number | null;
  longitude: number | null;
  last_location_updated_at: string | null;
  relationship_goal: string | null;
  role: 'user' | 'admin' | 'moderator';
  subscription_tier: 'free' | 'premium';
  profile_boosted_until: string | null;
  boost_started_at?: string | null;
  is_visible: boolean;
  is_verified?: boolean;
  verification_selfie_url?: string | null;
  verification_status?: 'pending' | 'approved' | 'rejected' | null;
  push_match_enabled?: boolean;
  push_message_enabled?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Like {
  id: string;
  liker_id: string;
  liked_id: string;
  is_super_like: boolean;
  created_at: string;
}

export interface Match {
  id: string;
  user_a_id: string;
  user_b_id: string;
  created_at: string;
}

export interface Message {
  id: string;
  match_id: string;
  sender_id: string;
  content: string;
  client_message_id?: string | null;
  read_at: string | null;
  reply_to_message_id?: string | null;
  deleted_at?: string | null;
  deleted_by?: string | null;
  created_at: string;
}

export interface MessageReceipt {
  message_id: string;
  user_id: string;
  delivered_at: string | null;
  read_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface Confession {
  id: string;
  city: string;
  content: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  is_removed: boolean;
}

export interface Report {
  id: string;
  reporter_id: string;
  report_type: 'user' | 'confession' | 'message';
  target_user_id: string | null;
  target_confession_id: string | null;
  target_message_id: string | null;
  reason: string | null;
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed';
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface Referral {
  id: string;
  referrer_id: string;
  referred_user_id: string;
  created_at: string;
  rewarded_at: string | null;
}

export interface ProfileView {
  id: string;
  viewer_id: string;
  viewed_id: string;
  created_at: string;
}

export interface DailyUsage {
  user_id: string;
  day: string; // YYYY-MM-DD
  rewinds_used: number;
  created_at: string;
  updated_at: string;
}

export interface VerificationRequest {
  id: string;
  user_id: string;
  selfie_ref: string;
  status: 'pending' | 'approved' | 'rejected' | string;
  reviewed_at: string | null;
  created_at: string;
}
