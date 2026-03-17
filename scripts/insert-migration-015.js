const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL');

  const c = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  await c.query(
    "insert into supabase_migrations.schema_migrations(version,name,statements) values ('015','fix_auth_user_created_trigger', ARRAY[]::text[]) on conflict (version) do nothing"
  );

  const v = await c.query('select version,name from supabase_migrations.schema_migrations order by version');
  console.log('latest', v.rows.slice(-5));

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

