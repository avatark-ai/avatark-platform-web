-- AvatarK Platform — Auth Bootstrap
-- Real justification: without this, a new auth.users row never gets a
-- corresponding profiles row, and every adapter's profile.get() would
-- fail for a brand-new user until they explicitly created one -- a real
-- gap, not a nice-to-have. Mirrors PrometheusK's own working
-- handle_new_user() trigger pattern.
CREATE OR REPLACE FUNCTION handle_new_platform_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.account_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_platform_auth_user_created ON auth.users;
CREATE TRIGGER on_platform_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_platform_user();

-- updated_at maintenance, applied to all three tables.
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS account_preferences_updated_at ON account_preferences;
CREATE TRIGGER account_preferences_updated_at
  BEFORE UPDATE ON account_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS privacy_settings_updated_at ON privacy_settings;
CREATE TRIGGER privacy_settings_updated_at
  BEFORE UPDATE ON privacy_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
