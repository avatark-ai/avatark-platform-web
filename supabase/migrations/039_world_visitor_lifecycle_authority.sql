-- AvatarK Platform — WORLDK-M13: durable visitor lifecycle authority.
--
-- PREVIEW-CERTIFICATION ONLY. Owner-approved (M13 Decision B) for
-- avatark-platform-preview (gxjdbfpyyrycvqzozyty) ONLY. The migration
-- runner refuses to apply this file to any other project. It must be
-- separately reviewed and certified before any other environment.
--
-- Forward-only and additive over 037/038 (neither is edited). It closes the
-- gaps M13 reconnaissance found in 037:
--   * no event identity  -> a replayed arrival incremented visit_count again
--   * no visit identity  -> a second arrival while open was accepted
--   * no authority       -> any EXECUTE holder could assert any subject
--   * caller time        -> any timestamp was accepted
--   * broad write paths  -> service_role (BYPASSRLS) could EXECUTE the 037
--                           writers and anon/authenticated still held
--                           TRUNCATE/DML on world_visitor_continuity
--
-- What this adds:
--   1. world_lifecycle_authorities  — allowlist binding a world to the one
--      authority permitted to confirm lifecycle events for it. Seeded with
--      the M13 Preview harness for living-forest only.
--   2. world_visitor_lifecycle_events — append-only lifecycle log. event_id
--      is the replay/idempotency identity (primary key).
--   3. world_visitor_continuity.open_visit_id — one open visit per
--      (world, subject); departure must name it.
--   4. record_world_lifecycle_arrival_v2 / record_world_lifecycle_departure_v2
--      — SECURITY DEFINER, pinned search_path, the ONLY lifecycle writers.
--   5. Roles:
--        worldk_lifecycle_authority        NOLOGIN writer role: USAGE on
--                                          schema public + EXECUTE on the
--                                          two v2 functions, nothing else.
--        worldk_lifecycle_harness_preview  the revocable credential. Created
--                                          NOLOGIN here; an operator enables
--                                          LOGIN with an out-of-band password
--                                          on the Preview DB only. It holds
--                                          NO privileges itself and must
--                                          SET ROLE worldk_lifecycle_authority
--                                          (membership is non-inheriting).
--   6. Hardening: continuity table DML/TRUNCATE revoked from anon,
--      authenticated and service_role (SELECT kept; RLS read_own kept);
--      legacy 037 writers revoked from service_role.
--
-- Authority model: the v2 functions refuse to run unless the SESSION user
-- (the login credential, not the definer) may SET ROLE to
-- worldk_lifecycle_authority. So the function owner (postgres), the
-- dashboard SQL editor and service_role cannot write lifecycle events even
-- though postgres owns the functions.
--
-- The seeded authority is PREVIEW_AUTHORITY_SIMULATION: it stands for "an
-- authoritative runtime/lifecycle producer confirmed this event" during
-- certification. It is NOT a runtime receipt, NOT WorldEntry, and NOT
-- evidence that a live runtime exists. WorldK holds no path to any of this.
--
-- Trusted time: occurred_at must fall inside the open window
-- (now() - 15 minutes, now() + 1 minute) of the DATABASE clock at write
-- time; recorded_at is always now(). Caller clocks are never authority.
--
-- The functions write only world_visitor_continuity and the lifecycle log.
-- They never touch world state.

-- ── 1. World / authority allowlist ─────────────────────────────────

CREATE TABLE IF NOT EXISTS world_lifecycle_authorities (
  world_id text NOT NULL,
  authority_id text NOT NULL,
  authority_kind text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (world_id, authority_id),
  CONSTRAINT world_lifecycle_authorities_world_id_format CHECK (world_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT world_lifecycle_authorities_kind_valid CHECK (authority_kind IN ('PREVIEW_AUTHORITY_SIMULATION'))
);

INSERT INTO world_lifecycle_authorities (world_id, authority_id, authority_kind)
VALUES ('living-forest', 'worldk-m13-preview-lifecycle-harness', 'PREVIEW_AUTHORITY_SIMULATION')
ON CONFLICT DO NOTHING;

ALTER TABLE world_lifecycle_authorities ENABLE ROW LEVEL SECURITY;

-- ── 2. Append-only lifecycle event log ─────────────────────────────

CREATE TABLE IF NOT EXISTS world_visitor_lifecycle_events (
  event_id uuid PRIMARY KEY,
  event_type text NOT NULL,
  world_id text NOT NULL,
  -- Validated against auth.users at write time. Deliberately no FK: an
  -- append-only log cannot cascade-delete, and the continuity row (which
  -- does cascade) is the visitor-facing record.
  subject_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  world_tick integer NOT NULL,
  place_id text,
  authority_kind text NOT NULL,
  authority_id text NOT NULL,
  provenance jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- Commit evidence, set by the writer function inside the same transaction.
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by text NOT NULL DEFAULT session_user,
  recorded_txid bigint NOT NULL DEFAULT txid_current(),
  resulting_visit_count integer NOT NULL,
  resulting_visit_open boolean NOT NULL,
  CONSTRAINT world_visitor_lifecycle_events_type_valid CHECK (event_type IN ('CONFIRMED_ARRIVAL', 'CONFIRMED_DEPARTURE')),
  CONSTRAINT world_visitor_lifecycle_events_tick_non_negative CHECK (world_tick >= 0),
  CONSTRAINT world_visitor_lifecycle_events_provenance_object CHECK (jsonb_typeof(provenance) = 'object' AND octet_length(provenance::text) <= 4096),
  -- One arrival and at most one departure per visit, ever.
  CONSTRAINT world_visitor_lifecycle_events_one_per_visit UNIQUE (visit_id, event_type),
  CONSTRAINT world_visitor_lifecycle_events_authority_fk FOREIGN KEY (world_id, authority_id) REFERENCES world_lifecycle_authorities (world_id, authority_id)
);

ALTER TABLE world_visitor_lifecycle_events ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION world_visitor_lifecycle_events_append_only() RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  RAISE EXCEPTION 'world_visitor_lifecycle_events is append-only (% refused)', TG_OP USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS world_visitor_lifecycle_events_no_update_delete ON world_visitor_lifecycle_events;
CREATE TRIGGER world_visitor_lifecycle_events_no_update_delete
  BEFORE UPDATE OR DELETE ON world_visitor_lifecycle_events
  FOR EACH ROW EXECUTE FUNCTION world_visitor_lifecycle_events_append_only();

DROP TRIGGER IF EXISTS world_visitor_lifecycle_events_no_truncate ON world_visitor_lifecycle_events;
CREATE TRIGGER world_visitor_lifecycle_events_no_truncate
  BEFORE TRUNCATE ON world_visitor_lifecycle_events
  FOR EACH STATEMENT EXECUTE FUNCTION world_visitor_lifecycle_events_append_only();

-- ── 3. One open visit per (world, subject) ─────────────────────────

ALTER TABLE world_visitor_continuity ADD COLUMN IF NOT EXISTS open_visit_id uuid;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_visitor_continuity_open_visit_id_requires_open') THEN
    ALTER TABLE world_visitor_continuity
      ADD CONSTRAINT world_visitor_continuity_open_visit_id_requires_open CHECK (open_visit_id IS NULL OR visit_open);
  END IF;
END $$;

-- ── 4. Roles ───────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worldk_lifecycle_authority') THEN
    CREATE ROLE worldk_lifecycle_authority NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worldk_lifecycle_harness_preview') THEN
    -- The credential. NOLOGIN until an operator enables it out-of-band.
    CREATE ROLE worldk_lifecycle_harness_preview NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

-- Controlled assumption: may SET ROLE, never inherits.
GRANT worldk_lifecycle_authority TO worldk_lifecycle_harness_preview WITH INHERIT FALSE, SET TRUE;

-- ── 5. V2 lifecycle writers ────────────────────────────────────────

-- Shared guard: authority, world allowlist, trusted time, tick, provenance.
CREATE OR REPLACE FUNCTION world_lifecycle_assert_authority(
  p_world_id text,
  p_authority_kind text,
  p_authority_id text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT pg_has_role(session_user, 'worldk_lifecycle_authority', 'SET') THEN
    RAISE EXCEPTION 'AUTHORITY_INVALID' USING ERRCODE = '42501', DETAIL = 'session is not a lifecycle authority credential';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM world_lifecycle_authorities WHERE world_id = p_world_id) THEN
    RAISE EXCEPTION 'WORLD_NOT_ALLOWED' USING ERRCODE = '42501', DETAIL = format('world %L is not allowlisted for lifecycle writes', p_world_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM world_lifecycle_authorities
    WHERE world_id = p_world_id AND authority_id = p_authority_id AND authority_kind = p_authority_kind
  ) THEN
    RAISE EXCEPTION 'AUTHORITY_INVALID' USING ERRCODE = '42501', DETAIL = 'authority is not bound to this world';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION world_lifecycle_assert_event_shape(
  p_subject_id uuid,
  p_occurred_at timestamptz,
  p_world_tick integer,
  p_provenance jsonb
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF p_subject_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_subject_id) THEN
    RAISE EXCEPTION 'SUBJECT_INVALID' USING ERRCODE = '22023';
  END IF;
  IF p_occurred_at IS NULL OR NOT (p_occurred_at > now() - interval '15 minutes' AND p_occurred_at < now() + interval '1 minute') THEN
    RAISE EXCEPTION 'TIME_OUT_OF_BOUNDS' USING ERRCODE = '22023', DETAIL = 'occurred_at must be within (db now - 15 minutes, db now + 1 minute)';
  END IF;
  IF p_world_tick IS NULL OR p_world_tick < 0 THEN
    RAISE EXCEPTION 'INVALID_TICK' USING ERRCODE = '22023';
  END IF;
  IF p_provenance IS NULL OR jsonb_typeof(p_provenance) <> 'object' OR octet_length(p_provenance::text) > 4096 THEN
    RAISE EXCEPTION 'PROVENANCE_INVALID' USING ERRCODE = '22023';
  END IF;
END;
$$;

-- Result row. The writer sees only the continuity it just produced.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'world_lifecycle_result') THEN
    CREATE TYPE world_lifecycle_result AS (
      outcome text,            -- APPLIED | IDEMPOTENT_REPLAY
      event_id uuid,
      event_type text,
      world_id text,
      subject_id uuid,
      visit_id uuid,
      visit_count integer,
      visit_open boolean,
      open_visit_id uuid,
      last_seen_at timestamptz,
      last_seen_tick integer,
      last_seen_basis text,
      recorded_at timestamptz
    );
  END IF;
END $$;

-- Idempotency: an existing event_id with the same canonical payload is a
-- no-op replay; with any difference it is EVENT_ID_CONFLICT.
CREATE OR REPLACE FUNCTION world_lifecycle_replay(
  p_event_id uuid,
  p_event_type text,
  p_world_id text,
  p_subject_id uuid,
  p_visit_id uuid,
  p_occurred_at timestamptz,
  p_world_tick integer,
  p_place_id text,
  p_authority_kind text,
  p_authority_id text,
  p_provenance jsonb
) RETURNS world_lifecycle_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  ev world_visitor_lifecycle_events;
  c world_visitor_continuity;
  r world_lifecycle_result;
BEGIN
  SELECT * INTO ev FROM world_visitor_lifecycle_events WHERE event_id = p_event_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF (ev.event_type, ev.world_id, ev.subject_id, ev.visit_id, ev.occurred_at, ev.world_tick, ev.place_id, ev.authority_kind, ev.authority_id, ev.provenance)
     IS DISTINCT FROM
     (p_event_type, p_world_id, p_subject_id, p_visit_id, p_occurred_at, p_world_tick, p_place_id, p_authority_kind, p_authority_id, p_provenance) THEN
    RAISE EXCEPTION 'EVENT_ID_CONFLICT' USING ERRCODE = '23505', DETAIL = 'event_id already recorded with a different payload';
  END IF;
  SELECT * INTO c FROM world_visitor_continuity WHERE world_id = ev.world_id AND subject_id = ev.subject_id;
  r := ROW('IDEMPOTENT_REPLAY', ev.event_id, ev.event_type, ev.world_id, ev.subject_id, ev.visit_id,
           c.visit_count, c.visit_open, c.open_visit_id, c.last_seen_at, c.last_seen_tick, c.last_seen_basis, ev.recorded_at);
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION record_world_lifecycle_arrival_v2(
  p_event_id uuid,
  p_world_id text,
  p_subject_id uuid,
  p_visit_id uuid,
  p_occurred_at timestamptz,
  p_world_tick integer,
  p_place_id text,
  p_authority_kind text,
  p_authority_id text,
  p_provenance jsonb
) RETURNS world_lifecycle_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing world_visitor_continuity;
  c world_visitor_continuity;
  r world_lifecycle_result;
  rec_at timestamptz;
  had_row boolean;
BEGIN
  IF p_event_id IS NULL OR p_visit_id IS NULL THEN
    RAISE EXCEPTION 'EVENT_IDENTITY_REQUIRED' USING ERRCODE = '22023';
  END IF;
  PERFORM world_lifecycle_assert_authority(p_world_id, p_authority_kind, p_authority_id);
  -- Serialize all lifecycle writes for one (world, subject).
  PERFORM pg_advisory_xact_lock(hashtextextended(p_world_id || '/' || COALESCE(p_subject_id::text, ''), 39));

  r := world_lifecycle_replay(p_event_id, 'CONFIRMED_ARRIVAL', p_world_id, p_subject_id, p_visit_id, p_occurred_at, p_world_tick, p_place_id, p_authority_kind, p_authority_id, p_provenance);
  -- (A composite IS NOT NULL only when every field is non-null; test the tag.)
  IF r.outcome IS NOT NULL THEN
    RETURN r;
  END IF;

  PERFORM world_lifecycle_assert_event_shape(p_subject_id, p_occurred_at, p_world_tick, p_provenance);

  SELECT * INTO existing FROM world_visitor_continuity
    WHERE world_id = p_world_id AND subject_id = p_subject_id
    FOR UPDATE;

  had_row := FOUND;

  IF had_row AND existing.visit_open THEN
    RAISE EXCEPTION 'VISIT_ALREADY_OPEN' USING ERRCODE = '55000', DETAIL = 'depart the open visit before a new arrival';
  END IF;
  IF had_row AND p_world_tick < existing.last_seen_tick THEN
    RAISE EXCEPTION 'TICK_REGRESSION' USING ERRCODE = '22023', DETAIL = format('arrival tick %s precedes last seen tick %s', p_world_tick, existing.last_seen_tick);
  END IF;
  IF EXISTS (SELECT 1 FROM world_visitor_lifecycle_events WHERE visit_id = p_visit_id) THEN
    RAISE EXCEPTION 'VISIT_ID_REUSED' USING ERRCODE = '23505', DETAIL = 'a visit id opens exactly one visit';
  END IF;

  IF NOT had_row THEN
    INSERT INTO world_visitor_continuity (
      world_id, subject_id, visit_count, first_entered_at, last_entered_at, last_entered_tick,
      last_left_at, visit_open, open_visit_id, last_seen_at, last_seen_tick, last_seen_basis, last_place_id, encountered_place_ids
    ) VALUES (
      p_world_id, p_subject_id, 1, p_occurred_at, p_occurred_at, p_world_tick,
      NULL, true, p_visit_id, p_occurred_at, p_world_tick, 'ENTRY_CONFIRMED', p_place_id,
      CASE WHEN p_place_id IS NULL THEN '{}'::text[] ELSE ARRAY[p_place_id] END
    ) RETURNING * INTO c;
  ELSE
    UPDATE world_visitor_continuity SET
      visit_count = existing.visit_count + 1,
      last_entered_at = p_occurred_at,
      last_entered_tick = p_world_tick,
      last_left_at = NULL,
      visit_open = true,
      open_visit_id = p_visit_id,
      last_seen_at = p_occurred_at,
      last_seen_tick = p_world_tick,
      last_seen_basis = 'ENTRY_CONFIRMED',
      last_place_id = COALESCE(p_place_id, existing.last_place_id),
      encountered_place_ids = CASE
        WHEN p_place_id IS NULL OR p_place_id = ANY(existing.encountered_place_ids) THEN existing.encountered_place_ids
        ELSE existing.encountered_place_ids || p_place_id
      END,
      updated_at = now()
    WHERE world_id = p_world_id AND subject_id = p_subject_id
    RETURNING * INTO c;
  END IF;

  INSERT INTO world_visitor_lifecycle_events (
    event_id, event_type, world_id, subject_id, visit_id, occurred_at, world_tick, place_id,
    authority_kind, authority_id, provenance, resulting_visit_count, resulting_visit_open
  ) VALUES (
    p_event_id, 'CONFIRMED_ARRIVAL', p_world_id, p_subject_id, p_visit_id, p_occurred_at, p_world_tick, p_place_id,
    p_authority_kind, p_authority_id, p_provenance, c.visit_count, c.visit_open
  ) RETURNING recorded_at INTO rec_at;

  r := ROW('APPLIED', p_event_id, 'CONFIRMED_ARRIVAL', p_world_id, p_subject_id, p_visit_id,
           c.visit_count, c.visit_open, c.open_visit_id, c.last_seen_at, c.last_seen_tick, c.last_seen_basis, rec_at);
  RETURN r;
END;
$$;

CREATE OR REPLACE FUNCTION record_world_lifecycle_departure_v2(
  p_event_id uuid,
  p_world_id text,
  p_subject_id uuid,
  p_visit_id uuid,
  p_occurred_at timestamptz,
  p_world_tick integer,
  p_place_id text,
  p_authority_kind text,
  p_authority_id text,
  p_provenance jsonb
) RETURNS world_lifecycle_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  existing world_visitor_continuity;
  c world_visitor_continuity;
  r world_lifecycle_result;
  rec_at timestamptz;
BEGIN
  IF p_event_id IS NULL OR p_visit_id IS NULL THEN
    RAISE EXCEPTION 'EVENT_IDENTITY_REQUIRED' USING ERRCODE = '22023';
  END IF;
  PERFORM world_lifecycle_assert_authority(p_world_id, p_authority_kind, p_authority_id);
  PERFORM pg_advisory_xact_lock(hashtextextended(p_world_id || '/' || COALESCE(p_subject_id::text, ''), 39));

  r := world_lifecycle_replay(p_event_id, 'CONFIRMED_DEPARTURE', p_world_id, p_subject_id, p_visit_id, p_occurred_at, p_world_tick, p_place_id, p_authority_kind, p_authority_id, p_provenance);
  -- (A composite IS NOT NULL only when every field is non-null; test the tag.)
  IF r.outcome IS NOT NULL THEN
    RETURN r;
  END IF;

  PERFORM world_lifecycle_assert_event_shape(p_subject_id, p_occurred_at, p_world_tick, p_provenance);

  SELECT * INTO existing FROM world_visitor_continuity
    WHERE world_id = p_world_id AND subject_id = p_subject_id
    FOR UPDATE;

  IF NOT FOUND OR NOT existing.visit_open THEN
    RAISE EXCEPTION 'NO_OPEN_VISIT' USING ERRCODE = '55000';
  END IF;
  IF existing.open_visit_id IS DISTINCT FROM p_visit_id THEN
    RAISE EXCEPTION 'VISIT_MISMATCH' USING ERRCODE = '55000', DETAIL = 'departure does not name the open visit';
  END IF;
  IF p_world_tick < existing.last_seen_tick THEN
    RAISE EXCEPTION 'TICK_REGRESSION' USING ERRCODE = '22023', DETAIL = format('departure tick %s precedes last seen tick %s', p_world_tick, existing.last_seen_tick);
  END IF;

  UPDATE world_visitor_continuity SET
    last_left_at = p_occurred_at,
    visit_open = false,
    open_visit_id = NULL,
    last_seen_at = p_occurred_at,
    last_seen_tick = p_world_tick,
    last_seen_basis = 'LEAVE_RECORDED',
    last_place_id = COALESCE(p_place_id, existing.last_place_id),
    encountered_place_ids = CASE
      WHEN p_place_id IS NULL OR p_place_id = ANY(existing.encountered_place_ids) THEN existing.encountered_place_ids
      ELSE existing.encountered_place_ids || p_place_id
    END,
    updated_at = now()
  WHERE world_id = p_world_id AND subject_id = p_subject_id
  RETURNING * INTO c;

  INSERT INTO world_visitor_lifecycle_events (
    event_id, event_type, world_id, subject_id, visit_id, occurred_at, world_tick, place_id,
    authority_kind, authority_id, provenance, resulting_visit_count, resulting_visit_open
  ) VALUES (
    p_event_id, 'CONFIRMED_DEPARTURE', p_world_id, p_subject_id, p_visit_id, p_occurred_at, p_world_tick, p_place_id,
    p_authority_kind, p_authority_id, p_provenance, c.visit_count, c.visit_open
  ) RETURNING recorded_at INTO rec_at;

  r := ROW('APPLIED', p_event_id, 'CONFIRMED_DEPARTURE', p_world_id, p_subject_id, p_visit_id,
           c.visit_count, c.visit_open, c.open_visit_id, c.last_seen_at, c.last_seen_tick, c.last_seen_basis, rec_at);
  RETURN r;
END;
$$;

-- ── 6. Privileges ──────────────────────────────────────────────────
-- Supabase default privileges grant new public tables/functions to anon,
-- authenticated and service_role; REVOKE ... FROM PUBLIC alone does not
-- remove those (038 finding). Revoke from each role explicitly.

REVOKE ALL ON TABLE world_lifecycle_authorities FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON TABLE world_visitor_lifecycle_events FROM PUBLIC, anon, authenticated, service_role;

-- Continuity: visitors read their own row (RLS read_own); nobody but the
-- v2 definer functions writes it.
REVOKE ALL ON TABLE world_visitor_continuity FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE world_visitor_continuity TO authenticated, service_role;

REVOKE ALL ON FUNCTION world_visitor_lifecycle_events_append_only() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_lifecycle_assert_authority(text, text, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_lifecycle_assert_event_shape(uuid, timestamptz, integer, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_lifecycle_replay(uuid, text, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION record_world_lifecycle_arrival_v2(uuid, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION record_world_lifecycle_departure_v2(uuid, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO worldk_lifecycle_authority;
GRANT EXECUTE ON FUNCTION record_world_lifecycle_arrival_v2(uuid, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb) TO worldk_lifecycle_authority;
GRANT EXECUTE ON FUNCTION record_world_lifecycle_departure_v2(uuid, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb) TO worldk_lifecycle_authority;

-- Legacy 037 writers: no alternate write path around the event log.
-- (M13 audit: no non-test caller exists on any branch.)
REVOKE EXECUTE ON FUNCTION record_world_confirmed_entry(text, uuid, timestamptz, integer, text) FROM service_role;
REVOKE EXECUTE ON FUNCTION record_world_leave(text, uuid, timestamptz, integer, text) FROM service_role;
