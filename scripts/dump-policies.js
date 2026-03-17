const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL');

  const tables = [
    'profiles',
    'likes',
    'matches',
    'messages',
    'blocked_users',
    'reports',
    'confessions',
    'confession_likes',
    'confession_comments',
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
    `select schemaname, tablename, policyname, cmd, roles, qual, with_check
     from pg_policies
     where schemaname='public' and tablename = any($1)
     order by tablename, policyname`,
    [tables]
  );

  const out = {};
  for (const r of pol.rows) {
    const k = `${r.schemaname}.${r.tablename}`;
    out[k] ||= [];
    out[k].push({
      policyname: r.policyname,
      cmd: r.cmd,
      roles: r.roles,
      qual: r.qual,
      with_check: r.with_check,
    });
  }

  // JSON only (so it's safe to pipe into other tools)
  console.log(JSON.stringify(out, null, 2));

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

