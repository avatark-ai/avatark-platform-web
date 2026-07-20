-- AvatarK Platform — Platform Roles
-- Global (not per-product) roles. Today's only real consumer is Platform
-- Admin authorization ('admin'); the type is left as free text rather than
-- an enum since the mission anticipates more platform-level roles later
-- and a text column is the reversible choice.
CREATE TABLE IF NOT EXISTS platform_roles (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role)
);
