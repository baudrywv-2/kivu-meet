/**
 * Seed 2 dummy profiles for testing.
 * Requires: SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 * Run: node scripts/seed-dummy-profiles.js
 */

const fs = require('fs');
const path = require('path');
const envPath = path.join(__dirname, '..', '.env.local');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8').split('\n').forEach((line) => {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) {
      const val = m[2].trim().replace(/^["']|["']$/g, '');
      process.env[m[1].trim()] = val;
    }
  });
}

const { createClient } = require('@supabase/supabase-js');

const DUMMY_PROFILES = [
  {
    email: 'dummy1@kivumeet.test',
    password: 'TestPass123!',
    name: 'Amina',
    age: 24,
    city: 'Goma',
    bio: 'Love music, travel, and good food. Looking for genuine connections and new adventures in the city.',
    interests: ['Music', 'Travel', 'Food', 'Dancing'],
    relationship_goal: 'dating',
    avatar_url: 'https://i.pravatar.cc/400/600?img=11',
  },
  {
    email: 'dummy2@kivumeet.test',
    password: 'TestPass123!',
    name: 'David',
    age: 26,
    city: 'Goma',
    bio: 'Tech enthusiast, fitness lover. Always up for coffee chats and exploring Kinshasa.',
    interests: ['Tech', 'Fitness', 'Cooking', 'Movies'],
    relationship_goal: 'friends',
    avatar_url: 'https://i.pravatar.cc/400/600?img=12',
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log('Seeding dummy profiles...\n');

  for (const profile of DUMMY_PROFILES) {
    const { email, password, ...profileData } = profile;

    // Create auth user (or get existing)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    let userId;
    if (authError) {
      if (authError.message?.includes('already been registered')) {
        const { data: existing } = await supabase.auth.admin.listUsers();
        const user = existing?.users?.find((u) => u.email === email);
        if (user) userId = user.id;
      }
      if (!userId) {
        console.error(`Failed to create user ${email}:`, authError.message);
        continue;
      }
    } else {
      userId = authData.user.id;
    }

    // Upsert profile
    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        name: profileData.name,
        age: profileData.age,
        city: profileData.city,
        bio: profileData.bio,
        interests: profileData.interests,
        relationship_goal: profileData.relationship_goal,
        avatar_url: profileData.avatar_url,
        is_visible: true,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error(`Failed to create profile for ${profileData.name}:`, profileError.message);
    } else {
      console.log(`✓ ${profileData.name} (${profileData.city}, ${profileData.age}) - ${profileData.avatar_url}`);
    }
  }

  console.log('\nDone! Sign in with dummy1@kivumeet.test or dummy2@kivumeet.test (password: TestPass123!)');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
