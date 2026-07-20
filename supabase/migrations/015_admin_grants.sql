-- AvatarK Platform — Table Grants for organizations/roles/product-access/audit
-- Same real gap as 007_grants.sql: RLS policies restrict a permitted
-- operation, they don't grant permission. Explicit here rather than
-- assumed, for the same reason 007 was explicit.

GRANT SELECT ON organizations TO authenticated;
GRANT SELECT ON organization_members TO authenticated;
GRANT SELECT ON platform_roles TO authenticated;
GRANT SELECT ON product_access TO authenticated;
-- No grant at all to `authenticated` on platform_audit_events -- it is
-- unreachable via the anon/authenticated (RLS-governed) client, full stop.

-- Explicit service-role grants: this repo's admin surfaces read and write
-- these tables exclusively through lib/supabase/admin.ts's service-role
-- client, which bypasses RLS but still needs standard table privileges.
GRANT SELECT, INSERT, UPDATE, DELETE ON organizations TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON organization_members TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON platform_roles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON product_access TO service_role;
GRANT SELECT, INSERT ON platform_audit_events TO service_role;
