-- AvatarK Platform — Privacy Consent Columns
-- Real, necessary fix: migration 004 created privacy_settings without
-- product_communications_enabled/personalization_enabled/
-- analytics_enabled -- these were being synthesized as hardcoded `true`
-- in the API route, a real persistence gap, not just a documentation
-- issue. Migration 004 itself is NOT rewritten (it's already applied
-- and checksummed) -- this is a genuine, new, additive migration.
--
-- Default choice: false, not true. These are consent-oriented settings
-- -- a new user has not affirmatively opted into product communications,
-- personalization, or analytics, and defaulting to true would mean
-- silently assuming consent that was never given. This differs
-- deliberately from analytics_enabled's naming, which could be
-- mistaken for a purely operational/diagnostic flag (like error
-- logging) -- it is not; it governs real, personal user-analytics
-- consent, and is treated with the same false-by-default discipline as
-- the other two.
--
-- Backfill: ALTER TABLE ... ADD COLUMN ... NOT NULL DEFAULT false
-- deterministically backfills every existing row to `false` as part of
-- the single ALTER statement itself -- this is real, standard Postgres
-- behavior, not a separate, fallible backfill step that could partially
-- fail.

ALTER TABLE privacy_settings
  ADD COLUMN IF NOT EXISTS product_communications_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS personalization_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS analytics_enabled boolean NOT NULL DEFAULT false;
