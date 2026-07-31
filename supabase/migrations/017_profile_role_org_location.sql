-- AvatarK Platform — Profile role/organization/location columns
-- Real fix, not a design nicety: the shared @avatark/account ProfileTab UI
-- already collects Role/Organization/Location and sends them on Save
-- (adapters.profile.update(form) with all six fields), but this table had
-- no columns to hold them, so app/api/account/profile/route.ts silently
-- dropped every save of these three fields -- a reproducible data-loss bug,
-- not a hypothetical one. profiles remains the sole canonical store for
-- these fields, same as display_name/bio/avatar_url before it.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS organization text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS location text;
