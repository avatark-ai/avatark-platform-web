-- AvatarK Platform — Organization Invitation Acceptance
-- Migration 016 created organization_invitations with columns to track
-- who issued and revoked an invite (invited_by, revoked_at) but nothing to
-- record who accepted it -- there was no accept flow yet at the time (see
-- app/admin/organizations/[id]/page.tsx's own "no self-serve accept flow
-- exists yet" comment). This is a new, additive migration, not a
-- modification of 016: it only adds a column and an index, no existing
-- column/constraint/policy changes.
ALTER TABLE organization_invitations
  ADD COLUMN IF NOT EXISTS accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- Supports "does this signed-in user have any pending invitations" lookups
-- (the accept-flow's own listing query) without a full table scan.
CREATE INDEX IF NOT EXISTS organization_invitations_email_idx ON organization_invitations(email);

-- No RLS/grant changes: organization_invitations remains service-role-only
-- (migration 016's default-deny posture, unchanged). The self-serve accept
-- route (app/api/account/organizations/invitations/**) reads/writes this
-- table through the service-role admin client, same as every admin route,
-- after authenticating the caller via the normal session and checking
-- (in application code) that the invitation's email matches that caller's
-- own verified email -- RLS was never going to express "the token holder
-- whose email matches" as a policy, so this was always going to be an
-- application-layer check.
