export const CITIES = ['Goma', 'Bukavu', 'Beni', 'Butembo', 'Kinshasa', 'Lubumbashi', 'Kisangani', 'Matadi', 'Other'];

/** Max lengths for user-generated content (enforced server-side and recommended client-side) */
export const CONTENT_LIMITS = {
  message: 2000,
  bio: 500,
  confession: 1000,
  confessionComment: 500,
  reportReason: 500,
} as const;

export const INTERESTS = [
  'Music', 'Travel', 'Food', 'Sports', 'Art', 'Tech', 'Reading', 'Movies',
  'Dancing', 'Cooking', 'Photography', 'Fitness', 'Nature', 'Gaming',
];

export const RELATIONSHIP_GOALS = [
  { value: '', label: 'Select' },
  { value: 'dating', label: 'Dating' },
  { value: 'friends', label: 'Friends' },
  { value: 'serious', label: 'Serious relationship' },
  { value: 'casual', label: 'Casual' },
];
