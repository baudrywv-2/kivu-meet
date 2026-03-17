const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL');

  const c = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const triggers = await c.query(
    `select event_object_schema, event_object_table, trigger_name, action_timing, event_manipulation, action_statement
     from information_schema.triggers
     where event_object_schema='auth' and event_object_table='users'
     order by trigger_name`
  );
  console.log('auth.users triggers', triggers.rows);

  const candidateFns = await c.query(
    `select n.nspname as schema, p.proname as name, pg_get_functiondef(p.oid) as def
     from pg_proc p
     join pg_namespace n on n.oid=p.pronamespace
     where p.proname ilike '%handle%new%user%'
        or p.proname ilike '%create%profile%'
        or p.proname ilike '%on_auth_user_created%'
     order by n.nspname, p.proname`
  );

  console.log(
    'candidate functions',
    candidateFns.rows.map((r) => ({
      schema: r.schema,
      name: r.name,
      def_preview: String(r.def).slice(0, 600),
    }))
  );

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

