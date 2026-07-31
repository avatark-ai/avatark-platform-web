# Shared Profile Source-of-Truth Defect

Status: **two defects, one fixed here, one still owned by `gamek-web`.**

## Fixed in this repository (Workstream D): role/organization/location were silently dropped

`public.profiles` (`002_profiles.sql`) never had columns for `role`,
`organization`, or `location`, even though the shared `@avatark/account`
package's `ProfileTab` UI collects and sends all three on Save. Because the
columns didn't exist, `app/api/account/profile/route.ts` hardcoded all
three to `null` on every GET and silently dropped them from every PATCH —
a user who typed a Role, clicked Save, and reloaded the Profile tab saw it
blanked out. Not a cosmetic gap: reproducible data loss, in-repo, unrelated
to the cross-repo `gamek-web` defect below.

Fixed by:
- `supabase/migrations/017_profile_role_org_location.sql` — adds
  `role text`, `organization text`, `location text` to `profiles`, governed
  by the same existing owner-only RLS policies and grants (no new policy
  needed; `005_rls.sql`'s `auth.uid() = id` policies and `007_grants.sql`'s
  `SELECT, INSERT, UPDATE` grant already cover the whole row).
- `lib/account/profileMapping.ts` — extracted, unit-tested pure mapping
  (`toProfileResponse`/`toProfileUpdates`) so `app/api/account/profile/route.ts`
  now reads/writes all six canonical fields instead of hardcoding three to
  null. See `lib/account/profileMapping.test.ts`.

Verified directly (disposable local Postgres, migrations run verbatim, not
inferred from reading the SQL — same method as
`docs/PLATFORM_DATABASE_VERIFICATION.md`):
- Migration applies cleanly and is idempotent (re-run: `NOTICE: column ...
  already exists, skipping` on all three columns, zero errors).
- Bootstrap behavior for a missing profile row: inserting a fresh
  `auth.users` row auto-creates a `profiles` row via
  `handle_new_platform_user()` (`006_auth_bootstrap.sql`,
  `009_privacy_bootstrap_fix.sql`) with `display_name` derived from the
  email's local part and `role`/`organization`/`location` correctly `NULL`
  (the trigger only ever sets `display_name` — everything else is
  genuinely unset until the person fills it in, not silently defaulted to
  a fabricated value).

## Not fixed here: the cross-repo `gamek-web` defect

The fix belongs to `gamek-web` — this document exists so that repo's owner
has an exact, evidenced description to act on, and so this repo's own
documentation doesn't understate the gap. Per this workstream's explicit
boundary ("Do not modify gamek-web"), no file in `gamek-web` was touched.

## The defect

Once `gamek-web` and `avatark-platform-web` share one Supabase project
(`avatark-platform-test`), a person's profile fields
(`displayName`/`bio`/`avatarUrl`) are read from and written to **two
different, unsynchronized places** depending on which app they're using.

### AvatarK Platform's canonical path (this repo)

- Table: `public.profiles` (`supabase/migrations/002_profiles.sql`) —
  `id uuid PRIMARY KEY REFERENCES auth.users(id)`, `display_name`,
  `username`, `avatar_url`, `bio`, `timezone`, `locale`.
- Bootstrapped automatically for every new `auth.users` row by the
  `handle_new_platform_user()` trigger (`006_auth_bootstrap.sql`, extended
  by `009_privacy_bootstrap_fix.sql`) — this fires on `auth.users` insert
  regardless of which product the user actually signed up through, so a
  `profiles` row exists for every user in the shared project, GameK
  signups included.
- Read/write path: `app/api/account/profile/route.ts:9`
  (`supabase.from('profiles').select('*').eq('id', user.id).single()`)
  and `:27` (`supabase.from('profiles').update(updates).eq('id', user.id)`).
- Consumed elsewhere in this repo by `lib/identity/supabaseIdentityProvider.ts`'s
  `loadClaims()` (reads `profiles.display_name`) and by Platform Admin's
  Users search — i.e. `profiles` is already the thing other parts of the
  shared identity contract depend on, not just the Account UI.
- Governed by real RLS (`005_rls.sql`: `profiles_select_own`,
  `profiles_insert_own`, `profiles_update_own`, all `auth.uid() = id`) and
  real grants (`007_grants.sql`: `SELECT, INSERT, UPDATE ON profiles TO
  authenticated`).

### GameK's current path

- `gamek-web/lib/account/adapters.ts`, `profile.get()`/`profile.update()` —
  read/write `user.user_metadata.display_name` /
  `user.user_metadata.bio` / `user.user_metadata.avatar_url` via
  `supabase.auth.getUser()` and `supabase.auth.updateUser({ data: metadata })`.
- The adapter's own comment states the reasoning explicitly: "No profiles
  table exists for GameK (no new backend, per mission) — displayName/bio/
  avatar are honestly read from/written to Supabase auth's own
  user_metadata rather than a fabricated new table." This was a correct,
  honest call at the time it was written — GameK had no shared Supabase
  project to have a `profiles` table in. It stops being correct the
  moment GameK points at `avatark-platform-test`, where a real `profiles`
  table already exists and is already the canonical store.

### Why this is a real defect, not a style difference

`auth.users.user_metadata` and `public.profiles` do not sync with each
other in either direction — Supabase does not reconcile them, and no code
in either repo reads one to update the other. Concretely, once both apps
share `avatark-platform-test`:

- A user who sets their display name in AvatarK Platform's `/account`
  writes to `profiles.display_name`. Opening GameK's account surface
  reads `user_metadata.display_name` instead — still empty/stale, showing
  a different name (or none) for the same person.
- A user who sets their display name in GameK writes to
  `user_metadata.display_name`. `profiles.display_name` never changes —
  so `lib/identity/supabaseIdentityProvider.ts`'s `loadClaims()` and
  Platform Admin's Users view keep showing the old value, and any other
  future consumer of the shared identity contract (which is specified
  against `profiles`, not `user_metadata`) never sees the GameK-set name
  at all.

This will visibly misbehave for real users, not just in a theoretical
edge case — it is a correctness defect in the shared-identity contract,
not a cosmetic inconsistency.

## The required architectural correction

**`gamek-web`'s `@avatark/account` adapter must read and write the
canonical `public.profiles` row, keyed by the authenticated AvatarK user
ID (`auth.uid()` / `user.id`), the same way `avatark-platform-web`'s
adapter already does** — via a `profiles` select/update scoped to the
signed-in user, relying on the same RLS policies and grants that already
exist and are already verified (`005_rls.sql`, `007_grants.sql`). No new
table, migration, or RLS policy is required for this fix — `profiles`
already exists, is already bootstrapped for every user via the
`auth.users` trigger, and is already reachable under RLS from any client
holding a valid session for `avatark-platform-test`. The change is
entirely inside `gamek-web`'s own adapter code.

`auth.users.user_metadata` may continue to hold: minimal bootstrap values
set at signup time, cached/denormalized claims for fast client-side reads,
or identity-provider-supplied metadata (e.g. a Google profile picture URL
at first sign-in). It must not remain the canonical, editable store for
any field that `profiles` already owns.

## Scope note

This document describes the defect and the required correction. It does
not implement the correction. Per this task's explicit boundary, no file
in `gamek-web` was modified from this session.
