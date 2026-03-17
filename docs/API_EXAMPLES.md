# Kivu Meet - API Examples (Supabase)

All interactions use the Supabase client. Examples assume `supabase` is the created client.

---

## Authentication

```typescript
// Sign up with email
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
  options: { emailRedirectTo: 'https://app.com/auth/callback' }
});

// Sign in with OTP
const { data, error } = await supabase.auth.signInWithOtp({
  email: 'user@example.com',
  options: { emailRedirectTo: 'https://app.com/auth/callback' }
});

// Sign in with phone OTP
const { data, error } = await supabase.auth.signInWithOtp({
  phone: '+243812345678'
});

// Get current user
const { data: { user } } = await supabase.auth.getUser();
```

---

## Profile Creation

```typescript
const { error } = await supabase.from('profiles').upsert({
  id: user.id,
  email: user.email,
  name: 'Marie',
  age: 25,
  city: 'Goma',
  bio: 'Love music and travel',
  interests: ['Music', 'Travel', 'Food'],
  relationship_goal: 'dating',
}, { onConflict: 'id' });
```

---

## Swipe / Likes

```typescript
// Like (swipe right)
const { error } = await supabase.from('likes').insert({
  liker_id: currentUserId,
  liked_id: targetUserId,
  is_super_like: false,
});

// Super like
const { error } = await supabase.from('likes').insert({
  liker_id: currentUserId,
  liked_id: targetUserId,
  is_super_like: true,
});
```

---

## Matches

Matches are auto-created by database trigger on mutual like. To fetch:

```typescript
const { data } = await supabase
  .from('matches')
  .select('id, user_a_id, user_b_id, created_at')
  .or(`user_a_id.eq.${userId},user_b_id.eq.${userId}`)
  .order('created_at', { ascending: false });
```

---

## Chat Messages

```typescript
// Send message
const { error } = await supabase.from('messages').insert({
  match_id: matchId,
  sender_id: userId,
  content: 'Hello!',
});

// Fetch messages
const { data } = await supabase
  .from('messages')
  .select('*')
  .eq('match_id', matchId)
  .order('created_at', { ascending: true });

// Realtime subscription
supabase
  .channel('messages')
  .on('postgres_changes', {
    event: 'INSERT',
    schema: 'public',
    table: 'messages',
    filter: `match_id=eq.${matchId}`,
  }, (payload) => console.log(payload.new))
  .subscribe();
```

---

## Confessions

```typescript
// Post confession
const { error } = await supabase.from('confessions').insert({
  city: 'Goma',
  content: 'Anonymous message here',
});

// Fetch confessions by city
const { data } = await supabase
  .from('confessions')
  .select('*')
  .eq('city', 'Goma')
  .eq('is_removed', false)
  .order('created_at', { ascending: false });

// Like confession
const { error } = await supabase.from('confession_likes').upsert({
  confession_id: confessionId,
  user_id: userId,
}, { onConflict: 'confession_id,user_id' });
```

---

## Safety (Block / Report)

```typescript
// Block user
await supabase.from('blocked_users').insert({
  blocker_id: userId,
  blocked_id: targetUserId,
});

// Report user
await supabase.from('reports').insert({
  reporter_id: userId,
  report_type: 'user',
  target_user_id: targetUserId,
  reason: 'Inappropriate behavior',
});
```
