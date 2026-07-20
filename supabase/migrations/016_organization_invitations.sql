-- AvatarK Platform — Organization Invitations
-- Pending invites to join an organization by email, before the invitee has
-- an account (or before they've accepted). Deliberately not exposed to
-- `authenticated` at all -- same default-deny posture as
-- platform_audit_events, since rows contain email addresses that
-- shouldn't be readable outside the service-role admin surface that
-- issues and revokes them.
CREATE TABLE IF NOT EXISTS organization_invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL DEFAULT 'member',
  token uuid NOT NULL DEFAULT gen_random_uuid(),
  invited_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  accepted_at timestamptz,
  revoked_at timestamptz
);

CREATE INDEX IF NOT EXISTS organization_invitations_org_id_idx ON organization_invitations(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS organization_invitations_token_idx ON organization_invitations(token);

ALTER TABLE organization_invitations ENABLE ROW LEVEL SECURITY;
-- No policy for `authenticated` -- service-role only, matching
-- platform_audit_events' default-deny rationale in migration 014.

GRANT SELECT, INSERT, UPDATE, DELETE ON organization_invitations TO service_role;
