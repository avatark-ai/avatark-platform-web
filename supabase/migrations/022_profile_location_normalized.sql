-- AvatarK Platform — Normalized profile location fields
-- Phase 4 of the "Platform RC" mission replaces the single free-text
-- `location` column (migration 017) with normalized fields, so a real
-- country/state/city (and a best-effort timezone) can be stored/queried
-- independently instead of as one opaque string. This is additive only,
-- same non-destructive precedent as migration 021: the old `location`
-- column is left in place, unused by new code, not dropped -- no existing
-- user data is discarded.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_country_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_country_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_state_code text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_state_name text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_city text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location_timezone text;

-- No RLS/grant changes: profiles' existing own-row RLS policy (migration
-- 005) already covers these new columns the same way it covers
-- role/organization/location today -- a plain column addition to a table
-- whose row-level policy is defined on the row, not per-column.
