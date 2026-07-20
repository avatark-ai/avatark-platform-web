-- AvatarK Platform — Audit Events
-- actor/action/target/timestamp/environment/result, per the Platform Admin
-- mission spec. Written only by server-side admin code paths using the
-- service-role client (RLS below intentionally grants no INSERT policy to
-- `authenticated` -- service_role bypasses RLS entirely, which is the only
-- intended writer).
CREATE TABLE IF NOT EXISTS platform_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  target_type text,
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  environment text NOT NULL,
  result text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS platform_audit_events_actor_id_idx ON platform_audit_events(actor_id);
CREATE INDEX IF NOT EXISTS platform_audit_events_target_id_idx ON platform_audit_events(target_id);
CREATE INDEX IF NOT EXISTS platform_audit_events_created_at_idx ON platform_audit_events(created_at DESC);
