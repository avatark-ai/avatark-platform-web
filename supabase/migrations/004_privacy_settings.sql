-- AvatarK Platform — Privacy Settings
-- Platform only. Explicitly NO Echo visibility, NO reflection
-- visibility, NO evidence visibility -- those are PrometheusK/Living-
-- Echo domain concepts. Real finding from the PrometheusK session:
-- @avatark/account's own PrivacySettings contract (defaultEchoVisibility,
-- defaultJourneyVisibility) hardcodes exactly those concepts, which is a
-- leaky abstraction in the package itself for a Platform-level host. This
-- table intentionally does NOT mirror that contract's fields -- it
-- defines what a genuine Platform-level privacy concept actually is.
-- The real platform-level `privacy` adapter (built in a later checkpoint)
-- will need to either request a package fix, or map these platform-
-- appropriate fields onto the contract's fields as honestly as possible
-- without fabricating Echo/Journey visibility that doesn't exist here.
CREATE TABLE IF NOT EXISTS privacy_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_visibility text NOT NULL DEFAULT 'private',
  discoverable_by_email boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
