/**
 * Kivu Meet - AI Matching Algorithm
 * MatchScore = 0.35×Compatibility + 0.20×Conversation + 0.15×Activity + 0.15×Distance + 0.10×ProfileQuality + 0.05×Popularity
 */

import type { Profile } from '@/types/database';

const WEIGHTS = {
  compatibility: 0.35,
  conversation: 0.2,
  activity: 0.15,
  distance: 0.15,
  profileQuality: 0.1,
  popularityBalance: 0.05,
} as const;

/** Haversine distance in km */
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function compatibilityScore(
  currentUser: Profile,
  candidate: Profile
): number {
  const currentInterests = new Set(currentUser.interests || []);
  const candidateInterests = new Set(candidate.interests || []);
  const shared = [...currentInterests].filter((i) => candidateInterests.has(i));
  const maxInterests = Math.max(
    currentInterests.size || 1,
    candidateInterests.size || 1,
    1
  );
  const interestScore = (shared.length / maxInterests) * 0.7;
  const goalMatch =
    currentUser.relationship_goal &&
    candidate.relationship_goal &&
    currentUser.relationship_goal === candidate.relationship_goal
      ? 0.3
      : 0;
  return Math.min(1, interestScore + goalMatch);
}

export function conversationProbability(
  _currentUser: Profile,
  candidate: Profile,
  matchesCount: number,
  messagesSentCount: number
): number {
  if (matchesCount === 0) return 0.5;
  const replyRate = messagesSentCount / matchesCount;
  return Math.min(1, replyRate);
}

export function activityScore(lastActiveAt: string | null): number {
  if (!lastActiveAt) return 0.5;
  const days = (Date.now() - new Date(lastActiveAt).getTime()) / (1000 * 60 * 60 * 24);
  return Math.exp(-days / 7);
}

export function distanceScore(
  userLat: number | null,
  userLon: number | null,
  candidateLat: number | null,
  candidateLon: number | null,
  maxRadiusKm = 50
): number {
  if (
    userLat == null ||
    userLon == null ||
    candidateLat == null ||
    candidateLon == null
  )
    return 0.5;
  const km = haversineKm(userLat, userLon, candidateLat, candidateLon);
  return Math.max(0, 1 - km / maxRadiusKm);
}

export function profileQualityScore(profile: Profile): number {
  let score = 0;
  if (profile.avatar_url) score += 0.25;
  if (profile.bio && profile.bio.length >= 20) score += 0.2;
  if (profile.interests?.length) score += Math.min(0.2, profile.interests.length * 0.05);
  if (profile.voice_intro_url) score += 0.2;
  if (profile.age && profile.city) score += 0.15;
  return Math.min(1, score);
}

export function popularityBalanceScore(likesReceivedCount: number): number {
  return 1 / (1 + Math.log(1 + likesReceivedCount));
}

export interface MatchScoreInput {
  currentUser: Profile;
  candidate: Profile;
  candidateLastActive: string | null;
  candidateMatchesCount: number;
  candidateMessagesSentCount: number;
  candidateLikesReceivedCount: number;
}

export function computeMatchScore(input: MatchScoreInput): number {
  const {
    currentUser,
    candidate,
    candidateLastActive,
    candidateMatchesCount,
    candidateMessagesSentCount,
    candidateLikesReceivedCount,
  } = input;

  const compat = compatibilityScore(currentUser, candidate);
  const conv = conversationProbability(
    currentUser,
    candidate,
    candidateMatchesCount,
    candidateMessagesSentCount
  );
  const activity = activityScore(candidateLastActive || candidate.updated_at);
  const distance = distanceScore(
    currentUser.latitude,
    currentUser.longitude,
    candidate.latitude,
    candidate.longitude
  );
  const quality = profileQualityScore(candidate);
  const popularity = popularityBalanceScore(candidateLikesReceivedCount);

  return (
    WEIGHTS.compatibility * compat +
    WEIGHTS.conversation * conv +
    WEIGHTS.activity * activity +
    WEIGHTS.distance * distance +
    WEIGHTS.profileQuality * quality +
    WEIGHTS.popularityBalance * popularity
  );
}
