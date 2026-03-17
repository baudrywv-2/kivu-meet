const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL');

  const c = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const legacy = ['blocks', 'swipes', 'typing_status', 'user_preferences'];

  const cols = await c.query(
    `select table_name, column_name, data_type
     from information_schema.columns
     where table_schema='public' and table_name = any($1)
     order by table_name, ordinal_position`,
    [legacy]
  );
  console.log('legacy_columns', cols.rows);

  const pol = await c.query(
    `select tablename, policyname, cmd, roles, qual, with_check
     from pg_policies
     where schemaname='public' and tablename = any($1)
     order by tablename, policyname`,
    [legacy]
  );
  console.log('legacy_policies', pol.rows);

  const rl = await c.query(
    `select relname as table, relrowsecurity as rls_enabled
     from pg_class
     join pg_namespace on pg_namespace.oid=pg_class.relnamespace
     where nspname='public' and relname = any($1)`,
    [legacy]
  );
  console.log('legacy_rls', rl.rows);

  const applied = await c.query(
    `select version, name
     from supabase_migrations.schema_migrations
     order by version`
  );
  console.log('applied_versions', applied.rows);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

