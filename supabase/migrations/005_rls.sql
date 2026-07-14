-- AvatarK Platform — Row Level Security
-- Every table: explicit policies, owner isolation, anonymous denial,
-- service-role access only where required. Modeled on PrometheusK's own
-- real, working migrations/001 RLS pattern.

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE privacy_settings ENABLE ROW LEVEL SECURITY;

-- profiles: owner can read/insert/update their own row. No anonymous
-- access. No public read (this is an identity table, not a public
-- directory -- profile_visibility in privacy_settings governs any future
-- public-facing exposure, which is a separate, later concern).
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- account_preferences: owner-only, full CRUD via one policy.
DROP POLICY IF EXISTS "account_preferences_owner_only" ON account_preferences;
CREATE POLICY "account_preferences_owner_only" ON account_preferences
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- privacy_settings: owner-only, full CRUD via one policy.
DROP POLICY IF EXISTS "privacy_settings_owner_only" ON privacy_settings;
CREATE POLICY "privacy_settings_owner_only" ON privacy_settings
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- No policy grants anonymous (unauthenticated) access to any of these
-- three tables -- RLS's default-deny behavior means anonymous requests
-- are already denied by the absence of a matching policy; nothing
-- additional is needed to enforce that, and no policy here references
-- the `anon` role at all.
