-- Reconcile migration history for migrations applied manually (008+)
-- This prevents future CLI runs from attempting to reapply them.

INSERT INTO supabase_migrations.schema_migrations(version, name, statements)
VALUES
  ('008', 'referrals_and_profile_views', ARRAY[]::text[]),
  ('009', 'app_schema_sync', ARRAY[]::text[]),
  ('010', 'storage_policy_hardening', ARRAY[]::text[]),
  ('011', 'storage_policy_cleanup', ARRAY[]::text[]),
  ('012', 'rls_hardening_legacy_tables', ARRAY[]::text[])
ON CONFLICT (version) DO NOTHING;

