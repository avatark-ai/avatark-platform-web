-- AvatarK Platform — Account Preferences
-- Platform preferences ONLY. No PrometheusK runtime state, no product-
-- specific concepts (confirmed against @avatark/account's real
-- PreferencesAdapter contract, which is genuinely product-agnostic --
-- unlike PrivacySettings, see 004's header comment).
CREATE TABLE IF NOT EXISTS account_preferences (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  theme text NOT NULL DEFAULT 'dark',
  language text NOT NULL DEFAULT 'en',
  notifications_enabled boolean NOT NULL DEFAULT true,
  default_product text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
