-- AvatarK Platform — Account Preferences RC1.1 additions
--
-- Two small, additive columns backing real RC1.1 account-UI sections
-- (never fabricated in-memory state):
--
-- notification_category_prefs: per-category notification preference
-- storage (Part 8). Defaults every category to enabled except the
-- mandatory 'security_account' category, which is not read from here at
-- all -- it is always on, enforced in application code, not by a stored
-- flag a user could ever flip off. This column is preference storage
-- only; it does not imply delivery infrastructure exists (see
-- lib/account/adapters.ts's notifications adapter and
-- NOTIFICATION_PREFERENCE_CATEGORY_REGISTRY for the honest distinction).
--
-- current_organization_id: which organization (if any) the user has
-- selected as their active context (Part 7). Null means Personal
-- context, the default for every existing row and every user with no
-- organization memberships.
--
-- reduced_motion: was already a rendered checkbox in the account UI before
-- this migration, but had no backing column -- toggling it silently did
-- nothing. Added here so it becomes a real, persisted preference instead
-- of a fabricated control.
ALTER TABLE account_preferences
  ADD COLUMN IF NOT EXISTS notification_category_prefs jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS current_organization_id uuid REFERENCES organizations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS reduced_motion boolean NOT NULL DEFAULT false;
