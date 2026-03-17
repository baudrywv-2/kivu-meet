const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL');

  const tables = [
    'profiles',
    'likes',
    'matches',
    'messages',
    'reports',
    'push_subscriptions',
    'referrals',
    'profile_views',
    'verification_requests',
    'daily_usage',
    'message_receipts',
    'message_reactions',
    'message_hidden',
  ];

  const c = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const pol = await c.query(
    "select tablename, policyname, roles from pg_policies where schemaname='public' and tablename = any($1) order by tablename, policyname",
    [tables]
  );

  const bad = pol.rows.filter((r) => String(r.roles || '').includes('public'));
  console.log('public_role_policies_remaining', bad.length);
  if (bad.length) console.log(bad);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

