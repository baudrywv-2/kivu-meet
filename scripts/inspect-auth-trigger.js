const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('Missing DATABASE_URL');

  const c = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const t = await c.query(
    `select t.tgname,
            pg_get_triggerdef(t.oid) as def,
            n.nspname as schema,
            p.proname,
            pg_get_functiondef(p.oid) as fn
     from pg_trigger t
     join pg_class rel on rel.oid=t.tgrelid
     join pg_namespace reln on reln.oid=rel.relnamespace
     join pg_proc p on p.oid=t.tgfoid
     join pg_namespace n on n.oid=p.pronamespace
     where reln.nspname='auth'
       and rel.relname='users'
       and not t.tgisinternal
     order by t.tgname`
  );

  console.log(
    'auth.users triggers',
    t.rows.map((r) => ({
      tgname: r.tgname,
      func: `${r.schema}.${r.proname}`,
      def: r.def,
    }))
  );
  console.log('function_def_snip', String(t.rows[0]?.fn || '').slice(0, 900));

  const up = await c.query(
    `select column_name, is_nullable, column_default, data_type
     from information_schema.columns
     where table_schema='public' and table_name='user_preferences'
     order by ordinal_position`
  );
  console.log('user_preferences_cols', up.rows);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

