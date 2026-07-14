-- AvatarK Platform — Fix Auth Bootstrap Trigger
-- Real, serious, pre-existing bug found while testing migration 008:
-- the original 006_auth_bootstrap.sql trigger only ever created
-- profiles and account_preferences rows for a new user -- privacy_settings
-- was never included. Confirmed directly: every real user who has
-- signed up on this platform to date has NO privacy_settings row at
-- all, meaning /api/account/privacy would fail with a real 500 for
-- them. Fixed by replacing the trigger function (CREATE OR REPLACE,
-- same function name/trigger -- 006 itself is not rewritten) to also
-- bootstrap privacy_settings.
CREATE OR REPLACE FUNCTION handle_new_platform_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, split_part(NEW.email, '@', 1))
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.account_preferences (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.privacy_settings (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Real, deterministic backfill for any already-existing auth.users rows
-- that were never given a privacy_settings row by the broken trigger --
-- this closes the gap for real, currently-affected accounts, not just
-- future signups.
INSERT INTO public.privacy_settings (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;
