-- AvatarK Platform — Experience Runtime journey state
-- Backs @avatark/experience-runtime's JourneyRepository interface
-- (lib/experienceRuntime/supabaseJourneyRepository.ts) with real
-- persistence. journey_id is free text, matching JourneyDefinition.id --
-- a code-owned data definition, not a foreign key -- the same convention
-- product_id uses in migration 012's product_access.
CREATE TABLE IF NOT EXISTS journey_states (
  subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id text NOT NULL,
  status text NOT NULL,
  current_episode_id text,
  current_world_id text,
  active_practice_id text,
  completed_episode_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  visited_world_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_practice_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_reflection_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  completed_milestone_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  started_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  PRIMARY KEY (subject_id, journey_id)
);

CREATE TABLE IF NOT EXISTS journey_transitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id text NOT NULL,
  type text NOT NULL,
  at timestamptz NOT NULL,
  node_id text,
  detail text
);

CREATE INDEX IF NOT EXISTS journey_transitions_subject_journey_idx
  ON journey_transitions(subject_id, journey_id, at);

ALTER TABLE journey_states ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_transitions ENABLE ROW LEVEL SECURITY;

-- Owner-only, full CRUD -- same pattern as migration 005's
-- account_preferences_owner_only. A subject's journey progress is their
-- own data, not shared or admin-readable here.
DROP POLICY IF EXISTS "journey_states_owner_only" ON journey_states;
CREATE POLICY "journey_states_owner_only" ON journey_states
  FOR ALL USING (auth.uid() = subject_id) WITH CHECK (auth.uid() = subject_id);

DROP POLICY IF EXISTS "journey_transitions_owner_only" ON journey_transitions;
CREATE POLICY "journey_transitions_owner_only" ON journey_transitions
  FOR ALL USING (auth.uid() = subject_id) WITH CHECK (auth.uid() = subject_id);
