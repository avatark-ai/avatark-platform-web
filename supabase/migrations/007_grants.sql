-- AvatarK Platform — Table Grants
-- Real, necessary fix: RLS policies restrict what a PERMITTED operation
-- can see/do -- they do not grant permission by themselves. Supabase's
-- default schema privileges give `authenticated` only TRUNCATE/TRIGGER/
-- REFERENCES on new tables, never SELECT/INSERT/UPDATE/DELETE. Without
-- this migration, every real query from an authenticated user fails with
-- "permission denied for table X" before RLS is ever consulted --
-- confirmed directly via a real isolation test that failed this exact
-- way before this migration existed.

GRANT SELECT, INSERT, UPDATE ON profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON account_preferences TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON privacy_settings TO authenticated;

-- No DELETE on profiles: no policy or product requirement for a user to
-- delete their own profile row exists yet (account deletion, if it ever
-- needs this, is a separate, later decision -- not implicitly granted
-- here).

-- schema_migrations: no grants to authenticated/anon at all. This is
-- infrastructure metadata, not user-facing data -- only the migration
-- runner (connecting as the postgres superuser via the pooler) should
-- ever read or write it.
