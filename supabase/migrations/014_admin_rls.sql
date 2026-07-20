-- AvatarK Platform — RLS for organizations/roles/product-access/audit
-- Read-only for `authenticated` and scoped to the caller's own rows/orgs.
-- All writes (org creation, role grants, product-access grants, audit
-- inserts) go through the service-role admin client from Platform Admin
-- server code -- no INSERT/UPDATE/DELETE policy exists for `authenticated`
-- on any of these tables. That is deliberate, not an oversight: the
-- mission explicitly calls for "no unsafe direct auth mutation without
-- confirmation," and no confirmation UI exists yet.

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "organizations_select_member" ON organizations;
CREATE POLICY "organizations_select_member" ON organizations
  FOR SELECT USING (
    id IN (SELECT org_id FROM organization_members WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "organization_members_select_own" ON organization_members;
CREATE POLICY "organization_members_select_own" ON organization_members
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "platform_roles_select_own" ON platform_roles;
CREATE POLICY "platform_roles_select_own" ON platform_roles
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "product_access_select_own" ON product_access;
CREATE POLICY "product_access_select_own" ON product_access
  FOR SELECT USING (user_id = auth.uid());

-- No policy at all for platform_audit_events: it is not exposed to
-- `authenticated` in any form (not even the actor's own events), since
-- default-deny is the correct posture for an audit log. Only the
-- service-role admin client (which bypasses RLS) can read or write it.
