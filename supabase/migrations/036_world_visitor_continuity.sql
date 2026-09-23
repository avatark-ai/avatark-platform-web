-- AvatarK Platform — WORLDK-M09: durable visitor/world absence ledger
-- (PROPOSAL -- additive successor migration, NOT APPLIED to any shared or
-- production database. Proven only against a disposable local Postgres in
-- WORLDK-M09's own test run. Applying it requires separate explicit
-- authorization.)
--
-- Why a new migration instead of editing 028: migration 028's four tables
-- (world_events, entity_memory_entries, historical_markers,
-- encounter_history_entries) are all WORLD-scoped shared truth. None of
-- them records per-visitor continuity, so none can replace the
-- caller-supplied `sinceTick` that getReturnRecognition() still takes.
-- 028 is left untouched (history preserved); this migration adds the one
-- missing piece.
--
-- Owner: AvatarK Platform World Memory.
-- Key:   (world_id, subject_id)
--   world_id   = CONSUMER world id (M07 identity, e.g. 'living-forest') —
--                deliberately not a runtime world instance id, so a runtime
--                re-provision never resets a visitor's continuity.
--   subject_id = AvatarK IdentityClaims.subjectId = auth.users.id. No other
--                visitor identifier is created.
--
-- Frozen M07 §7 semantics, enforced here (not in callers):
--   NO PRIOR VISIT     -> no row.
--   CONFIRMED ENTRY    -> only after runtime-confirmed arrival: visit_count+1,
--                         last_entered_at/tick, open visit, last_left_at NULL,
--                         last_seen = the entry point (basis ENTRY_CONFIRMED).
--   LEAVE              -> last_left_at, visit closed, last_seen = last
--                         confirmed-present point (basis LEAVE_RECORDED).
--   ABNORMAL DISCONNECT-> no presence heartbeat exists yet, so nothing is
--                         fabricated: last_seen stays at the confirmed entry
--                         point (ENTRY_CONFIRMED). PRESENCE_TIMEOUT is a valid
--                         column value (M07 enum) but no function writes it.
--   Browsing, viewing projections, or submitting an entry intent have NO
--   write path here at all.

CREATE TABLE IF NOT EXISTS world_visitor_continuity (
  world_id text NOT NULL,
  subject_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  visit_count integer NOT NULL,
  first_entered_at timestamptz NOT NULL,
  last_entered_at timestamptz NOT NULL,
  last_entered_tick integer NOT NULL,
  last_left_at timestamptz,
  visit_open boolean NOT NULL,
  last_seen_at timestamptz NOT NULL,
  last_seen_tick integer NOT NULL,
  last_seen_basis text NOT NULL,
  last_place_id text,
  encountered_place_ids text[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, subject_id),
  CONSTRAINT world_visitor_continuity_world_id_format CHECK (world_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT world_visitor_continuity_visit_count_positive CHECK (visit_count >= 1),
  CONSTRAINT world_visitor_continuity_ticks_non_negative CHECK (last_entered_tick >= 0 AND last_seen_tick >= 0),
  CONSTRAINT world_visitor_continuity_basis_valid CHECK (last_seen_basis IN ('LEAVE_RECORDED', 'PRESENCE_TIMEOUT', 'ENTRY_CONFIRMED')),
  CONSTRAINT world_visitor_continuity_open_visit_has_no_leave CHECK (NOT visit_open OR last_left_at IS NULL),
  CONSTRAINT world_visitor_continuity_seen_not_before_entry CHECK (last_seen_tick >= last_entered_tick)
);

-- Runtime-confirmed arrival. Called by the platform runtime host only.
CREATE OR REPLACE FUNCTION record_world_confirmed_entry(
  p_world_id text,
  p_subject_id uuid,
  p_at timestamptz,
  p_world_tick integer,
  p_place_id text
) RETURNS world_visitor_continuity
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing world_visitor_continuity;
  result world_visitor_continuity;
BEGIN
  IF p_world_tick < 0 THEN
    RAISE EXCEPTION 'world tick must be non-negative' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO existing FROM world_visitor_continuity
    WHERE world_id = p_world_id AND subject_id = p_subject_id
    FOR UPDATE;

  IF NOT FOUND THEN
    INSERT INTO world_visitor_continuity (
      world_id, subject_id, visit_count, first_entered_at, last_entered_at, last_entered_tick,
      last_left_at, visit_open, last_seen_at, last_seen_tick, last_seen_basis, last_place_id, encountered_place_ids
    ) VALUES (
      p_world_id, p_subject_id, 1, p_at, p_at, p_world_tick,
      NULL, true, p_at, p_world_tick, 'ENTRY_CONFIRMED', p_place_id,
      CASE WHEN p_place_id IS NULL THEN '{}'::text[] ELSE ARRAY[p_place_id] END
    ) RETURNING * INTO result;
    RETURN result;
  END IF;

  -- World time for one world only moves forward; a stale confirmation must
  -- never rewind continuity.
  IF p_world_tick < existing.last_seen_tick THEN
    RAISE EXCEPTION 'confirmed entry tick % precedes last seen tick %', p_world_tick, existing.last_seen_tick USING ERRCODE = '22023';
  END IF;

  UPDATE world_visitor_continuity SET
    visit_count = existing.visit_count + 1,
    last_entered_at = p_at,
    last_entered_tick = p_world_tick,
    last_left_at = NULL,
    visit_open = true,
    last_seen_at = p_at,
    last_seen_tick = p_world_tick,
    last_seen_basis = 'ENTRY_CONFIRMED',
    last_place_id = COALESCE(p_place_id, existing.last_place_id),
    encountered_place_ids = CASE
      WHEN p_place_id IS NULL OR p_place_id = ANY(existing.encountered_place_ids) THEN existing.encountered_place_ids
      ELSE existing.encountered_place_ids || p_place_id
    END,
    updated_at = now()
  WHERE world_id = p_world_id AND subject_id = p_subject_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

-- Runtime-recorded leave. Idempotent for an already-closed visit.
CREATE OR REPLACE FUNCTION record_world_leave(
  p_world_id text,
  p_subject_id uuid,
  p_at timestamptz,
  p_world_tick integer,
  p_place_id text
) RETURNS world_visitor_continuity
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing world_visitor_continuity;
  result world_visitor_continuity;
BEGIN
  SELECT * INTO existing FROM world_visitor_continuity
    WHERE world_id = p_world_id AND subject_id = p_subject_id
    FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'no confirmed entry to leave from' USING ERRCODE = 'P0002';
  END IF;

  IF NOT existing.visit_open THEN
    RETURN existing; -- already left; a repeated leave changes nothing
  END IF;

  IF p_world_tick < existing.last_seen_tick THEN
    RAISE EXCEPTION 'leave tick % precedes last seen tick %', p_world_tick, existing.last_seen_tick USING ERRCODE = '22023';
  END IF;

  UPDATE world_visitor_continuity SET
    last_left_at = p_at,
    visit_open = false,
    last_seen_at = p_at,
    last_seen_tick = p_world_tick,
    last_seen_basis = 'LEAVE_RECORDED',
    last_place_id = COALESCE(p_place_id, existing.last_place_id),
    encountered_place_ids = CASE
      WHEN p_place_id IS NULL OR p_place_id = ANY(existing.encountered_place_ids) THEN existing.encountered_place_ids
      ELSE existing.encountered_place_ids || p_place_id
    END,
    updated_at = now()
  WHERE world_id = p_world_id AND subject_id = p_subject_id
  RETURNING * INTO result;
  RETURN result;
END;
$$;

ALTER TABLE world_visitor_continuity ENABLE ROW LEVEL SECURITY;

-- A visitor may read only their own continuity row. There is no client
-- insert/update/delete policy: writes happen only through the two
-- functions above, executable by service_role alone.
DROP POLICY IF EXISTS "world_visitor_continuity_read_own" ON world_visitor_continuity;
CREATE POLICY "world_visitor_continuity_read_own" ON world_visitor_continuity
  FOR SELECT USING (subject_id = auth.uid());

REVOKE ALL ON FUNCTION record_world_confirmed_entry(text, uuid, timestamptz, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION record_world_leave(text, uuid, timestamptz, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION record_world_confirmed_entry(text, uuid, timestamptz, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION record_world_leave(text, uuid, timestamptz, integer, text) TO service_role;
