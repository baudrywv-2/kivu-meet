const { Client } = require('pg');

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('Missing DATABASE_URL');
  }

  const c = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });
  await c.connect();

  const buckets = await c.query('select id, public from storage.buckets order by id');
  console.log('buckets', buckets.rows);

  const pol = await c.query(
    "select schemaname, tablename, policyname, cmd from pg_policies where schemaname in ('public','storage') order by schemaname, tablename, policyname"
  );
  const by = {};
  for (const r of pol.rows) {
    const k = `${r.schemaname}.${r.tablename}`;
    by[k] = (by[k] || 0) + 1;
  }
  console.log('policies_by_table', by);

  const storageObj = await c.query(
    "select policyname, cmd, roles from pg_policies where schemaname='storage' and tablename='objects' order by policyname"
  );
  console.log('storage.objects policies', storageObj.rows);

  await c.end();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

