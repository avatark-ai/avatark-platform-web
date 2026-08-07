-- AvatarK Platform — Experience Registry (PROPOSAL -- NOT APPLIED, NOT
-- WIRED INTO supabase/scripts/run-platform-migrations.js's MIGRATION_ORDER)
--
-- Backs @avatark/experience-registry's ExperienceEventRepository interface
-- (packages/experience-registry/src/repository.ts) once a Postgres-backed
-- implementation is written and reviewed. Until then,
-- InMemoryExperienceEventRepository is the only implementation in the
-- package. This file exists so a reviewer has a concrete schema to react
-- to -- per the mission's "do not silently create schema without review" --
-- not as something already decided or run. See
-- packages/experience-registry/MIGRATION_PROPOSAL.md for the design
-- rationale, open questions, and rollout plan.
--
-- Mirrors two existing patterns rather than inventing a third:
--   - migration 013 (platform_audit_events): actor/action/target/metadata/
--     timestamp shape for a fact log.
--   - migration 023 in the sibling `feature/experience-runtime` worktree
--     (journey_states/journey_transitions): owner-only RLS via
--     `auth.uid() = <owner column>`, same convention as migration 005's
--     account_preferences_owner_only.
-- The two migrations share the number "023" only because they live on
-- separate, not-yet-merged branches off feature/avatar-platform-rc3 --
-- whichever merges first keeps 023; the other is renumbered at merge time.
CREATE TABLE IF NOT EXISTS experience_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  schema_version integer NOT NULL DEFAULT 1,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL,
  source_product_id text NOT NULL,
  source_component text,
  target_type text,
  target_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  correlation_id text,
  session_id text,
  -- Defense-in-depth mirrors of the application-level checks in
  -- packages/experience-registry/src/validation.ts -- the app is expected
  -- to reject malformed input before it ever reaches this table, but a
  -- direct or buggy writer shouldn't be able to bypass either bound.
  CONSTRAINT experience_events_type_format CHECK (type ~ '^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*(_[a-z0-9]+)*)+$'),
  CONSTRAINT experience_events_metadata_bounded CHECK (pg_column_size(metadata) <= 4096)
);

CREATE INDEX IF NOT EXISTS experience_events_user_recorded_idx ON experience_events(user_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS experience_events_user_type_idx ON experience_events(user_id, type);
CREATE INDEX IF NOT EXISTS experience_events_correlation_idx ON experience_events(correlation_id) WHERE correlation_id IS NOT NULL;

ALTER TABLE experience_events ENABLE ROW LEVEL SECURITY;

-- Owner-scoped SELECT + INSERT only. Deliberately no UPDATE or DELETE
-- policy at all -- with RLS enabled and no policy for an operation,
-- Postgres denies it outright, even to the owning user. This is the actual
-- enforcement of "immutable after write" and "no update()/delete() method
-- exists" (repository.ts) reaching all the way to the database, not just
-- the application layer honoring a convention.
DROP POLICY IF EXISTS "experience_events_owner_select" ON experience_events;
CREATE POLICY "experience_events_owner_select" ON experience_events
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "experience_events_owner_insert" ON experience_events;
CREATE POLICY "experience_events_owner_insert" ON experience_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No admin-read policy. The mission is explicit that administrative access,
-- if ever needed, "must be separately privileged" -- that is a future,
-- separately-reviewed policy (most likely a service-role-only path that
-- bypasses RLS entirely, per platform_audit_events' own precedent), not a
-- relaxation added here speculatively.
