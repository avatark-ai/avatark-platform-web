-- AvatarK Platform — WORLDK-M14-A: world entry & runtime lifecycle authority.
--
-- PREVIEW-CERTIFICATION ONLY. Owner-approved (M14 decisions D1–D9) for
-- avatark-platform-preview (gxjdbfpyyrycvqzozyty) ONLY. The migration
-- runner refuses to apply this file to any other project.
--
-- Forward-only and additive over 037/038/039. No earlier file is edited.
-- The one change to a 039 object is the authority-kind CHECK, which is
-- replaced (not loosened) to add exactly two kinds (D4):
--   RUNTIME_CONFIRMED          a registered runtime instance, authenticated at
--                              the Platform Runtime Ingress, evidenced it.
--   PLATFORM_PRESENCE_TIMEOUT  the Platform INFERRED a departure because
--                              authenticated runtime presence evidence stopped
--                              for longer than the world's grace window (D3).
--                              This is inference, not runtime evidence.
--   PREVIEW_AUTHORITY_SIMULATION (039) is retained.
--
-- Authority model (D1): the Platform is the only lifecycle mutation choke
-- point. Runtimes hold a Platform-issued per-instance credential (D2) that
-- the Platform verifies here; they hold no database credential. Every
-- function below except the owner-only registry functions refuses to run
-- unless the SESSION user may SET ROLE worldk_platform_entry_authority,
-- which only the Platform deployment's credential can.
--
--   entry:    world_entry_resolve            intent -> resolution (+ visit_id, allocation, ticket)
--   gateway:  world_entry_redeem_ticket      single-use ticket -> RuntimeSession
--             world_entry_session_view / _request_leave   (browser status page)
--   ingress:  world_runtime_poll / _claim / _arrival / _presence / _departure / _disconnect
--   sweeper:  world_presence_sweep           PRESENCE_TIMEOUT departures
--   registry: world_runtime_register_instance / _issue_credential /
--             _revoke_credential / _revoke_instance   (owner-only, operator)
--
-- Arrival/departure invariants (M14-A certification):
--   * intent, READY, ticket issuance, ticket redemption and runtime claim
--     never open a visit. Only world_runtime_arrival does, and only for a
--     claimed session bound to the caller's own allocation.
--   * visit_id is minted by world_entry_resolve (D9); runtimes only echo it.
--   * one arrival and at most one departure per visit (039's UNIQUE), and
--     the arrival/departure event ids are derived from the visit id, so
--     explicit departure and PRESENCE_TIMEOUT can never both be recorded.
--   * all lifecycle writes take 039's (world, subject) advisory lock.
--
-- Time (D3): lifecycle times are DATABASE time, never runtime clocks.
--   * arrival / explicit departure  occurred_at = now() at the receipt
--     (inside 039's (now-15min, now+1min) window by construction).
--   * PRESENCE_TIMEOUT              occurred_at = the last accepted presence
--     evidence (last_presence_at), which is DB time recorded when that
--     evidence was accepted. It may be older than 15 minutes if nothing
--     triggered the sweep, so the 039 caller-clock window does not apply to
--     it; instead it must lie in [visit arrival, now]. The outcome never
--     depends on when the sweep runs: once now > last_presence_at + grace,
--     every path (sweep, heartbeat, departure, reconnect) closes the visit
--     at last_presence_at, and no later evidence can revive it.

-- ── 1. Authority vocabulary (D4) ───────────────────────────────────

ALTER TABLE world_lifecycle_authorities DROP CONSTRAINT IF EXISTS world_lifecycle_authorities_kind_valid;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'world_lifecycle_authorities_kind_valid_040') THEN
    ALTER TABLE world_lifecycle_authorities ADD CONSTRAINT world_lifecycle_authorities_kind_valid_040
      CHECK (authority_kind IN ('PREVIEW_AUTHORITY_SIMULATION', 'RUNTIME_CONFIRMED', 'PLATFORM_PRESENCE_TIMEOUT'));
  END IF;
END $$;

INSERT INTO world_lifecycle_authorities (world_id, authority_id, authority_kind) VALUES
  ('living-forest', 'worldk-m14-runtime-ingress', 'RUNTIME_CONFIRMED'),
  ('living-forest', 'worldk-m14-presence-timeout', 'PLATFORM_PRESENCE_TIMEOUT')
ON CONFLICT DO NOTHING;

-- ── 2. Per-world entry / presence policy (not part of any consumer contract) ──

CREATE TABLE IF NOT EXISTS world_entry_policies (
  world_id text PRIMARY KEY,
  presence_grace_seconds integer NOT NULL,
  heartbeat_seconds integer NOT NULL,
  instance_liveness_seconds integer NOT NULL,
  ticket_ttl_seconds integer NOT NULL,
  intent_lifetime_seconds integer NOT NULL,
  credential_max_ttl_seconds integer NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT world_entry_policies_grace CHECK (presence_grace_seconds BETWEEN 30 AND 3600),
  CONSTRAINT world_entry_policies_heartbeat CHECK (heartbeat_seconds >= 1 AND heartbeat_seconds * 2 <= presence_grace_seconds),
  CONSTRAINT world_entry_policies_liveness CHECK (instance_liveness_seconds BETWEEN 5 AND 600),
  CONSTRAINT world_entry_policies_ticket CHECK (ticket_ttl_seconds BETWEEN 15 AND 300),
  CONSTRAINT world_entry_policies_intent CHECK (intent_lifetime_seconds >= ticket_ttl_seconds AND intent_lifetime_seconds <= 86400),
  CONSTRAINT world_entry_policies_credential CHECK (credential_max_ttl_seconds BETWEEN 300 AND 604800)
);

-- Preview policy: grace 120 s (D3), heartbeat 15 s, ticket 90 s (D8),
-- intent resolution 30 min, runtime credential at most 7 days (D2).
INSERT INTO world_entry_policies (world_id, presence_grace_seconds, heartbeat_seconds, instance_liveness_seconds, ticket_ttl_seconds, intent_lifetime_seconds, credential_max_ttl_seconds)
VALUES ('living-forest', 120, 15, 30, 90, 1800, 604800)
ON CONFLICT DO NOTHING;

-- ── 3. Runtime registry and credentials (D2) ───────────────────────

CREATE TABLE IF NOT EXISTS world_runtime_instances (
  instance_id uuid PRIMARY KEY,
  world_id text NOT NULL,
  authority_id text NOT NULL,
  label text NOT NULL,
  capacity integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'ACTIVE',
  readiness text NOT NULL DEFAULT 'OFFLINE',
  last_seen_at timestamptz,
  registered_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT world_runtime_instances_label CHECK (label ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(label) <= 64),
  CONSTRAINT world_runtime_instances_capacity CHECK (capacity BETWEEN 1 AND 64),
  CONSTRAINT world_runtime_instances_status CHECK (status IN ('ACTIVE', 'REVOKED')),
  CONSTRAINT world_runtime_instances_readiness CHECK (readiness IN ('OFFLINE', 'STARTING', 'READY')),
  CONSTRAINT world_runtime_instances_revoked CHECK ((status = 'REVOKED') = (revoked_at IS NOT NULL)),
  CONSTRAINT world_runtime_instances_authority_fk FOREIGN KEY (world_id, authority_id) REFERENCES world_lifecycle_authorities (world_id, authority_id)
);

CREATE TABLE IF NOT EXISTS world_runtime_credentials (
  credential_id uuid PRIMARY KEY,
  instance_id uuid NOT NULL REFERENCES world_runtime_instances (instance_id),
  -- sha256 of the secret. The plaintext never reaches the database.
  secret_sha256 bytea NOT NULL UNIQUE,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  CONSTRAINT world_runtime_credentials_hash CHECK (octet_length(secret_sha256) = 32),
  CONSTRAINT world_runtime_credentials_lifetime CHECK (expires_at > issued_at)
);

-- ── 4. Entry resolution, allocation, tickets, sessions, presence ──

CREATE TABLE IF NOT EXISTS world_entry_resolutions (
  intent_id uuid PRIMARY KEY,
  subject_id uuid NOT NULL,
  world_id text NOT NULL,
  outcome text NOT NULL,
  reason text,
  retry_after_seconds integer,
  visit_id uuid,
  allocation_id uuid,
  reconnect boolean NOT NULL DEFAULT false,
  requested_place_id text,
  arrival_kind text,
  arrival_place_id text,
  arrival_reason text,
  requested_place_honored boolean,
  resolved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  CONSTRAINT world_entry_resolutions_outcome CHECK (outcome IN ('READY', 'PENDING', 'UNAVAILABLE')),
  CONSTRAINT world_entry_resolutions_ready CHECK ((outcome = 'READY') = (visit_id IS NOT NULL AND allocation_id IS NOT NULL)),
  CONSTRAINT world_entry_resolutions_arrival_kind CHECK (arrival_kind IS NULL OR arrival_kind IN ('FIRST_VISIT', 'RETURNING')),
  CONSTRAINT world_entry_resolutions_arrival_reason CHECK (arrival_reason IS NULL OR arrival_reason IN ('FIRST_VISIT_ENTRY', 'PRIOR_PLACE', 'WORLD_DIRECTED', 'SAFE_FALLBACK'))
);

CREATE TABLE IF NOT EXISTS world_runtime_allocations (
  allocation_id uuid PRIMARY KEY,
  instance_id uuid NOT NULL REFERENCES world_runtime_instances (instance_id),
  world_id text NOT NULL,
  subject_id uuid NOT NULL,
  -- One allocation per visit; reconnects reuse it.
  visit_id uuid NOT NULL UNIQUE,
  intent_id uuid NOT NULL,
  arrival_place_id text,
  state text NOT NULL DEFAULT 'ALLOCATED',
  created_at timestamptz NOT NULL DEFAULT now(),
  released_at timestamptz,
  release_reason text,
  CONSTRAINT world_runtime_allocations_state CHECK (state IN ('ALLOCATED', 'ACTIVE', 'RELEASED')),
  CONSTRAINT world_runtime_allocations_released CHECK ((state = 'RELEASED') = (released_at IS NOT NULL)),
  CONSTRAINT world_runtime_allocations_release_reason CHECK (release_reason IS NULL OR release_reason IN ('ABANDONED', 'RUNTIME_DEPARTURE', 'PRESENCE_TIMEOUT', 'INSTANCE_REVOKED', 'VISIT_CLOSED_EXTERNALLY'))
);

CREATE TABLE IF NOT EXISTS world_entry_tickets (
  ticket_sha256 bytea PRIMARY KEY,
  intent_id uuid NOT NULL,
  allocation_id uuid NOT NULL REFERENCES world_runtime_allocations (allocation_id),
  subject_id uuid NOT NULL,
  world_id text NOT NULL,
  visit_id uuid NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  redeemed_at timestamptz,
  superseded_at timestamptz,
  session_id uuid,
  CONSTRAINT world_entry_tickets_hash CHECK (octet_length(ticket_sha256) = 32),
  CONSTRAINT world_entry_tickets_lifetime CHECK (expires_at > issued_at),
  CONSTRAINT world_entry_tickets_redeemed CHECK ((redeemed_at IS NULL) = (session_id IS NULL))
);

CREATE TABLE IF NOT EXISTS world_runtime_sessions (
  session_id uuid PRIMARY KEY,
  allocation_id uuid NOT NULL REFERENCES world_runtime_allocations (allocation_id),
  instance_id uuid NOT NULL REFERENCES world_runtime_instances (instance_id),
  world_id text NOT NULL,
  subject_id uuid NOT NULL,
  visit_id uuid NOT NULL,
  -- Browser status-page capability (hash only). Never shown to the runtime.
  view_sha256 bytea NOT NULL UNIQUE,
  reconnect boolean NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  joined_at timestamptz,
  leave_requested_at timestamptz,
  ended_at timestamptz,
  end_reason text,
  CONSTRAINT world_runtime_sessions_view_hash CHECK (octet_length(view_sha256) = 32),
  CONSTRAINT world_runtime_sessions_ended CHECK ((ended_at IS NULL) = (end_reason IS NULL)),
  CONSTRAINT world_runtime_sessions_end_reason CHECK (end_reason IS NULL OR end_reason IN ('DISCONNECTED', 'SUPERSEDED', 'VISIT_CLOSED'))
);

CREATE TABLE IF NOT EXISTS world_visit_presence (
  visit_id uuid PRIMARY KEY,
  world_id text NOT NULL,
  subject_id uuid NOT NULL,
  allocation_id uuid NOT NULL REFERENCES world_runtime_allocations (allocation_id),
  instance_id uuid NOT NULL REFERENCES world_runtime_instances (instance_id),
  opened_at timestamptz NOT NULL,
  -- DB time of the last ACCEPTED presence evidence (arrival, heartbeat, resume).
  last_presence_at timestamptz NOT NULL,
  last_presence_tick integer NOT NULL,
  closed_at timestamptz,
  close_kind text,
  close_event_id uuid,
  CONSTRAINT world_visit_presence_closed CHECK ((closed_at IS NULL) = (close_kind IS NULL)),
  CONSTRAINT world_visit_presence_close_kind CHECK (close_kind IS NULL OR close_kind IN ('RUNTIME_DEPARTURE', 'PRESENCE_TIMEOUT', 'VISIT_CLOSED_EXTERNALLY')),
  CONSTRAINT world_visit_presence_order CHECK (last_presence_at >= opened_at)
);

CREATE INDEX IF NOT EXISTS world_visit_presence_open_idx ON world_visit_presence (last_presence_at) WHERE closed_at IS NULL;
CREATE INDEX IF NOT EXISTS world_runtime_allocations_live_idx ON world_runtime_allocations (instance_id) WHERE state <> 'RELEASED';
CREATE INDEX IF NOT EXISTS world_runtime_sessions_open_idx ON world_runtime_sessions (instance_id) WHERE ended_at IS NULL;

-- Runtime receipt log: replay identity for runtime evidence.
CREATE TABLE IF NOT EXISTS world_runtime_receipts (
  receipt_id uuid PRIMARY KEY,
  kind text NOT NULL,
  credential_id uuid NOT NULL,
  instance_id uuid NOT NULL,
  session_id uuid NOT NULL,
  payload_digest text NOT NULL,
  outcome text NOT NULL,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT world_runtime_receipts_kind CHECK (kind IN ('ARRIVAL', 'PRESENCE', 'DEPARTURE', 'DISCONNECT'))
);

ALTER TABLE world_entry_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_runtime_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_runtime_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_entry_resolutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_runtime_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_entry_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_runtime_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_visit_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE world_runtime_receipts ENABLE ROW LEVEL SECURITY;

-- ── 5. Roles ───────────────────────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worldk_platform_entry_authority') THEN
    CREATE ROLE worldk_platform_entry_authority NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'worldk_platform_entry_preview') THEN
    -- The Platform deployment's credential. NOLOGIN until an operator
    -- enables it out-of-band on the Preview DB only.
    CREATE ROLE worldk_platform_entry_preview NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;

GRANT worldk_platform_entry_authority TO worldk_platform_entry_preview WITH INHERIT FALSE, SET TRUE;

-- ── 6. Internal helpers (EXECUTE revoked from everyone; definer-only) ──

CREATE OR REPLACE FUNCTION world_m14_assert_platform() RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NOT pg_has_role(session_user, 'worldk_platform_entry_authority', 'SET') THEN
    RAISE EXCEPTION 'AUTHORITY_INVALID' USING ERRCODE = '42501', DETAIL = 'session is not the Platform entry authority credential';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION world_m14_policy(p_world_id text) RETURNS world_entry_policies
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  p world_entry_policies;
BEGIN
  SELECT * INTO p FROM world_entry_policies WHERE world_id = p_world_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'WORLD_NOT_ALLOWED' USING ERRCODE = '42501';
  END IF;
  RETURN p;
END;
$$;

-- 039's per-(world, subject) serialisation key, shared by every M14 writer.
CREATE OR REPLACE FUNCTION world_m14_lock(p_world_id text, p_subject_id uuid) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  SELECT pg_advisory_xact_lock(hashtextextended(p_world_id || '/' || COALESCE(p_subject_id::text, ''), 39));
$$;

-- Deterministic lifecycle event identity: one arrival and one departure per visit.
CREATE OR REPLACE FUNCTION world_m14_event_id(p_visit_id uuid, p_event_type text) RETURNS uuid
LANGUAGE sql
IMMUTABLE
SET search_path = pg_catalog, public
AS $$
  SELECT md5('worldk-m14:' || p_visit_id::text || ':' || p_event_type)::uuid;
$$;

-- Authenticates a runtime credential. Returns the instance, or raises.
CREATE OR REPLACE FUNCTION world_m14_authenticate_runtime(p_credential_id uuid, p_secret_sha256 bytea) RETURNS world_runtime_instances
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  cred world_runtime_credentials;
  inst world_runtime_instances;
BEGIN
  SELECT * INTO cred FROM world_runtime_credentials WHERE credential_id = p_credential_id;
  IF NOT FOUND OR p_secret_sha256 IS NULL OR cred.secret_sha256 IS DISTINCT FROM p_secret_sha256 THEN
    RAISE EXCEPTION 'RUNTIME_CREDENTIAL_INVALID' USING ERRCODE = '28000';
  END IF;
  IF cred.revoked_at IS NOT NULL THEN
    RAISE EXCEPTION 'RUNTIME_CREDENTIAL_REVOKED' USING ERRCODE = '28000';
  END IF;
  IF cred.expires_at <= now() THEN
    RAISE EXCEPTION 'RUNTIME_CREDENTIAL_EXPIRED' USING ERRCODE = '28000';
  END IF;
  SELECT * INTO inst FROM world_runtime_instances WHERE instance_id = cred.instance_id;
  IF inst.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'RUNTIME_INSTANCE_REVOKED' USING ERRCODE = '28000';
  END IF;
  RETURN inst;
END;
$$;

-- Receipt replay. NULL = new receipt; otherwise the stored outcome, or
-- RECEIPT_CONFLICT when the id was used with a different payload/runtime.
CREATE OR REPLACE FUNCTION world_m14_receipt_replay(p_receipt_id uuid, p_kind text, p_credential_id uuid, p_session_id uuid, p_digest text) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  r world_runtime_receipts;
BEGIN
  IF p_receipt_id IS NULL THEN
    RAISE EXCEPTION 'RECEIPT_IDENTITY_REQUIRED' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO r FROM world_runtime_receipts WHERE receipt_id = p_receipt_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF (r.kind, r.credential_id, r.session_id, r.payload_digest) IS DISTINCT FROM (p_kind, p_credential_id, p_session_id, p_digest) THEN
    RAISE EXCEPTION 'RECEIPT_CONFLICT' USING ERRCODE = '23505';
  END IF;
  RETURN r.outcome;
END;
$$;

-- The session a runtime is acting on: must be its own allocation's.
CREATE OR REPLACE FUNCTION world_m14_runtime_session(p_instance world_runtime_instances, p_session_id uuid) RETURNS world_runtime_sessions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  s world_runtime_sessions;
BEGIN
  SELECT * INTO s FROM world_runtime_sessions WHERE session_id = p_session_id;
  IF NOT FOUND OR s.instance_id <> p_instance.instance_id OR s.world_id <> p_instance.world_id THEN
    -- Foreign and unknown sessions are indistinguishable to the runtime.
    RAISE EXCEPTION 'SESSION_NOT_BOUND' USING ERRCODE = '42501';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM world_runtime_allocations a
    WHERE a.allocation_id = s.allocation_id AND a.instance_id = p_instance.instance_id
      AND a.visit_id = s.visit_id AND a.subject_id = s.subject_id AND a.world_id = s.world_id
  ) THEN
    RAISE EXCEPTION 'SESSION_NOT_BOUND' USING ERRCODE = '42501';
  END IF;
  RETURN s;
END;
$$;

-- Continuity mutation for a RUNTIME_CONFIRMED arrival. Same rules as 039
-- record_world_lifecycle_arrival_v2 (039's replay and shape helpers are
-- reused), with 040's authority in place of 039's session gate.
CREATE OR REPLACE FUNCTION world_m14_apply_arrival(
  p_event_id uuid, p_world_id text, p_subject_id uuid, p_visit_id uuid, p_occurred_at timestamptz,
  p_world_tick integer, p_place_id text, p_authority_kind text, p_authority_id text, p_provenance jsonb
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
  IF NOT EXISTS (SELECT 1 FROM world_lifecycle_authorities WHERE world_id = p_world_id AND authority_id = p_authority_id AND authority_kind = p_authority_kind) THEN
    RAISE EXCEPTION 'AUTHORITY_INVALID' USING ERRCODE = '42501';
  END IF;
  PERFORM world_m14_lock(p_world_id, p_subject_id);
  r := world_lifecycle_replay(p_event_id, 'CONFIRMED_ARRIVAL', p_world_id, p_subject_id, p_visit_id, p_occurred_at, p_world_tick, p_place_id, p_authority_kind, p_authority_id, p_provenance);
  IF r.outcome IS NOT NULL THEN
    RETURN r;
  END IF;
  PERFORM world_lifecycle_assert_event_shape(p_subject_id, p_occurred_at, p_world_tick, p_provenance);

  SELECT * INTO existing FROM world_visitor_continuity WHERE world_id = p_world_id AND subject_id = p_subject_id FOR UPDATE;
  had_row := FOUND;
  IF had_row AND existing.visit_open THEN
    RAISE EXCEPTION 'VISIT_ALREADY_OPEN' USING ERRCODE = '55000';
  END IF;
  IF had_row AND p_world_tick < existing.last_seen_tick THEN
    RAISE EXCEPTION 'TICK_REGRESSION' USING ERRCODE = '22023';
  END IF;
  IF EXISTS (SELECT 1 FROM world_visitor_lifecycle_events WHERE visit_id = p_visit_id) THEN
    RAISE EXCEPTION 'VISIT_ID_REUSED' USING ERRCODE = '23505';
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

-- Continuity mutation for a departure. p_basis LEAVE_RECORDED (runtime
-- evidence, occurred_at = receipt time, 039 window applies) or
-- PRESENCE_TIMEOUT (inferred, occurred_at = last accepted presence).
CREATE OR REPLACE FUNCTION world_m14_apply_departure(
  p_event_id uuid, p_world_id text, p_subject_id uuid, p_visit_id uuid, p_occurred_at timestamptz,
  p_world_tick integer, p_place_id text, p_authority_kind text, p_authority_id text, p_provenance jsonb, p_basis text
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
  IF NOT EXISTS (SELECT 1 FROM world_lifecycle_authorities WHERE world_id = p_world_id AND authority_id = p_authority_id AND authority_kind = p_authority_kind) THEN
    RAISE EXCEPTION 'AUTHORITY_INVALID' USING ERRCODE = '42501';
  END IF;
  IF NOT ((p_basis = 'LEAVE_RECORDED' AND p_authority_kind = 'RUNTIME_CONFIRMED')
       OR (p_basis = 'PRESENCE_TIMEOUT' AND p_authority_kind = 'PLATFORM_PRESENCE_TIMEOUT')) THEN
    RAISE EXCEPTION 'AUTHORITY_INVALID' USING ERRCODE = '42501', DETAIL = 'basis does not match authority kind';
  END IF;
  PERFORM world_m14_lock(p_world_id, p_subject_id);
  r := world_lifecycle_replay(p_event_id, 'CONFIRMED_DEPARTURE', p_world_id, p_subject_id, p_visit_id, p_occurred_at, p_world_tick, p_place_id, p_authority_kind, p_authority_id, p_provenance);
  IF r.outcome IS NOT NULL THEN
    RETURN r;
  END IF;

  IF p_basis = 'LEAVE_RECORDED' THEN
    PERFORM world_lifecycle_assert_event_shape(p_subject_id, p_occurred_at, p_world_tick, p_provenance);
  ELSE
    IF p_occurred_at IS NULL OR p_occurred_at > now() + interval '1 minute' THEN
      RAISE EXCEPTION 'TIME_OUT_OF_BOUNDS' USING ERRCODE = '22023';
    END IF;
    IF p_world_tick IS NULL OR p_world_tick < 0 THEN
      RAISE EXCEPTION 'INVALID_TICK' USING ERRCODE = '22023';
    END IF;
    IF p_provenance IS NULL OR jsonb_typeof(p_provenance) <> 'object' OR octet_length(p_provenance::text) > 4096 THEN
      RAISE EXCEPTION 'PROVENANCE_INVALID' USING ERRCODE = '22023';
    END IF;
  END IF;

  SELECT * INTO existing FROM world_visitor_continuity WHERE world_id = p_world_id AND subject_id = p_subject_id FOR UPDATE;
  IF NOT FOUND OR NOT existing.visit_open THEN
    RAISE EXCEPTION 'NO_OPEN_VISIT' USING ERRCODE = '55000';
  END IF;
  IF existing.open_visit_id IS DISTINCT FROM p_visit_id THEN
    RAISE EXCEPTION 'VISIT_MISMATCH' USING ERRCODE = '55000';
  END IF;
  IF p_world_tick < existing.last_seen_tick THEN
    RAISE EXCEPTION 'TICK_REGRESSION' USING ERRCODE = '22023';
  END IF;
  IF p_occurred_at < existing.last_entered_at THEN
    RAISE EXCEPTION 'TIME_OUT_OF_BOUNDS' USING ERRCODE = '22023', DETAIL = 'departure precedes the arrival of the open visit';
  END IF;

  UPDATE world_visitor_continuity SET
    last_left_at = p_occurred_at,
    visit_open = false,
    open_visit_id = NULL,
    last_seen_at = p_occurred_at,
    last_seen_tick = p_world_tick,
    last_seen_basis = p_basis,
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

-- Closes the visit's runtime bookkeeping after a terminal lifecycle outcome.
CREATE OR REPLACE FUNCTION world_m14_close_visit(p_presence world_visit_presence, p_close_kind text, p_event_id uuid, p_release_reason text) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE world_visit_presence SET closed_at = now(), close_kind = p_close_kind, close_event_id = p_event_id
    WHERE visit_id = p_presence.visit_id AND closed_at IS NULL;
  UPDATE world_runtime_allocations SET state = 'RELEASED', released_at = now(), release_reason = p_release_reason
    WHERE allocation_id = p_presence.allocation_id AND state <> 'RELEASED';
  UPDATE world_runtime_sessions SET ended_at = now(), end_reason = 'VISIT_CLOSED'
    WHERE visit_id = p_presence.visit_id AND ended_at IS NULL;
  UPDATE world_entry_tickets SET superseded_at = now()
    WHERE visit_id = p_presence.visit_id AND redeemed_at IS NULL AND superseded_at IS NULL;
END;
$$;

-- If the visit's presence evidence is older than the grace window, records
-- the PRESENCE_TIMEOUT departure (at last_presence_at) and returns true.
-- Caller must hold the (world, subject) lock.
CREATE OR REPLACE FUNCTION world_m14_timeout_if_expired(p_visit_id uuid) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  pr world_visit_presence;
  pol world_entry_policies;
  c world_visitor_continuity;
  ev uuid;
BEGIN
  SELECT * INTO pr FROM world_visit_presence WHERE visit_id = p_visit_id FOR UPDATE;
  IF NOT FOUND OR pr.closed_at IS NOT NULL THEN
    RETURN false;
  END IF;
  pol := world_m14_policy(pr.world_id);
  IF now() <= pr.last_presence_at + make_interval(secs => pol.presence_grace_seconds) THEN
    RETURN false;
  END IF;
  SELECT * INTO c FROM world_visitor_continuity WHERE world_id = pr.world_id AND subject_id = pr.subject_id FOR UPDATE;
  IF NOT FOUND OR NOT c.visit_open OR c.open_visit_id IS DISTINCT FROM pr.visit_id THEN
    -- Continuity was closed by another authority (e.g. the 039 harness):
    -- nothing to infer. Close the runtime bookkeeping only.
    PERFORM world_m14_close_visit(pr, 'VISIT_CLOSED_EXTERNALLY', NULL, 'VISIT_CLOSED_EXTERNALLY');
    RETURN true;
  END IF;
  ev := world_m14_event_id(pr.visit_id, 'CONFIRMED_DEPARTURE');
  PERFORM world_m14_apply_departure(
    ev, pr.world_id, pr.subject_id, pr.visit_id, pr.last_presence_at, pr.last_presence_tick, NULL,
    'PLATFORM_PRESENCE_TIMEOUT', 'worldk-m14-presence-timeout',
    jsonb_build_object('migration', '040', 'inferred', true, 'graceSeconds', pol.presence_grace_seconds,
                       'lastPresenceAt', pr.last_presence_at, 'allocationId', pr.allocation_id, 'instanceId', pr.instance_id),
    'PRESENCE_TIMEOUT');
  PERFORM world_m14_close_visit(pr, 'PRESENCE_TIMEOUT', ev, 'PRESENCE_TIMEOUT');
  RETURN true;
END;
$$;

-- Releases allocations that never produced an arrival and can no longer
-- (every ticket expired or superseded, and no session joined).
CREATE OR REPLACE FUNCTION world_m14_release_abandoned(p_world_id text) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  pol world_entry_policies;
  n integer;
BEGIN
  pol := world_m14_policy(p_world_id);
  UPDATE world_runtime_allocations a SET state = 'RELEASED', released_at = now(), release_reason = 'ABANDONED'
  WHERE a.world_id = p_world_id AND a.state = 'ALLOCATED'
    AND NOT EXISTS (SELECT 1 FROM world_visit_presence p WHERE p.visit_id = a.visit_id)
    AND NOT EXISTS (SELECT 1 FROM world_entry_tickets t WHERE t.allocation_id = a.allocation_id
                    AND t.redeemed_at IS NULL AND t.superseded_at IS NULL AND t.expires_at > now())
    AND NOT EXISTS (SELECT 1 FROM world_runtime_sessions s WHERE s.allocation_id = a.allocation_id
                    AND s.ended_at IS NULL AND s.redeemed_at > now() - make_interval(secs => pol.presence_grace_seconds));
  GET DIAGNOSTICS n = ROW_COUNT;
  UPDATE world_runtime_sessions s SET ended_at = now(), end_reason = 'VISIT_CLOSED'
  FROM world_runtime_allocations a
  WHERE s.allocation_id = a.allocation_id AND a.state = 'RELEASED' AND s.ended_at IS NULL;
  RETURN n;
END;
$$;

-- ── 7. Entry resolver (D8, D9) ─────────────────────────────────────

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'world_entry_resolution_result') THEN
    CREATE TYPE world_entry_resolution_result AS (
      outcome text,                -- READY | PENDING | UNAVAILABLE
      reason text,
      retry_after_seconds integer,
      visit_id uuid,
      reconnect boolean,
      ticket_expires_at timestamptz,
      arrival_kind text,
      arrival_place_id text,
      arrival_reason text,
      requested_place_honored boolean
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION world_entry_resolve(
  p_intent_id uuid,
  p_subject_id uuid,
  p_world_id text,
  p_requested_place_id text,
  p_arrival_kind text,
  p_arrival_place_id text,
  p_arrival_reason text,
  p_requested_place_honored boolean,
  p_ticket_sha256 bytea
) RETURNS world_entry_resolution_result
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  pol world_entry_policies;
  res world_entry_resolutions;
  had_res boolean;
  c world_visitor_continuity;
  pr world_visit_presence;
  alloc world_runtime_allocations;
  inst world_runtime_instances;
  orig world_entry_resolutions;
  v_visit uuid;
  v_alloc uuid;
  v_ticket_exp timestamptz;
  live_ready integer;
  live_starting integer;
  rv world_entry_resolution_result;
BEGIN
  PERFORM world_m14_assert_platform();
  IF p_intent_id IS NULL THEN
    RAISE EXCEPTION 'EVENT_IDENTITY_REQUIRED' USING ERRCODE = '22023';
  END IF;
  IF p_ticket_sha256 IS NULL OR octet_length(p_ticket_sha256) <> 32 THEN
    RAISE EXCEPTION 'TICKET_INVALID' USING ERRCODE = '22023';
  END IF;
  pol := world_m14_policy(p_world_id);
  IF p_subject_id IS NULL OR NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_subject_id) THEN
    RAISE EXCEPTION 'SUBJECT_INVALID' USING ERRCODE = '22023';
  END IF;
  PERFORM world_m14_lock(p_world_id, p_subject_id);

  -- Refusals first, so no refusal ever rolls back a mutation below.
  SELECT * INTO res FROM world_entry_resolutions WHERE intent_id = p_intent_id FOR UPDATE;
  had_res := FOUND;
  IF had_res AND (res.subject_id <> p_subject_id OR res.world_id <> p_world_id) THEN
    RAISE EXCEPTION 'INTENT_CONFLICT' USING ERRCODE = '23505';
  END IF;

  -- Deterministic grace expiry for this visitor before anything else.
  SELECT * INTO c FROM world_visitor_continuity WHERE world_id = p_world_id AND subject_id = p_subject_id;
  IF FOUND AND c.visit_open AND c.open_visit_id IS NOT NULL THEN
    PERFORM world_m14_timeout_if_expired(c.open_visit_id);
  END IF;
  PERFORM world_m14_release_abandoned(p_world_id);

  -- Idempotent replay of a terminal / still-usable resolution.
  IF had_res AND res.outcome <> 'PENDING' THEN
    IF res.outcome = 'READY' THEN
      SELECT * INTO alloc FROM world_runtime_allocations WHERE allocation_id = res.allocation_id;
      SELECT * INTO pr FROM world_visit_presence WHERE visit_id = res.visit_id;
      IF res.expires_at <= now() OR alloc.state = 'RELEASED' OR (FOUND AND pr.closed_at IS NOT NULL) THEN
        UPDATE world_entry_resolutions SET outcome = 'UNAVAILABLE', reason = 'RUNTIME_UNAVAILABLE', retry_after_seconds = NULL,
          visit_id = NULL, allocation_id = NULL, updated_at = now()
          WHERE intent_id = p_intent_id RETURNING * INTO res;
      ELSE
        -- Same resolution, fresh single-use ticket; outstanding ones are superseded.
        UPDATE world_entry_tickets SET superseded_at = now()
          WHERE allocation_id = res.allocation_id AND redeemed_at IS NULL AND superseded_at IS NULL;
        v_ticket_exp := now() + make_interval(secs => pol.ticket_ttl_seconds);
        INSERT INTO world_entry_tickets (ticket_sha256, intent_id, allocation_id, subject_id, world_id, visit_id, expires_at)
          VALUES (p_ticket_sha256, p_intent_id, res.allocation_id, p_subject_id, p_world_id, res.visit_id, v_ticket_exp);
      END IF;
    END IF;
    rv := ROW(res.outcome, res.reason, res.retry_after_seconds, res.visit_id, res.reconnect, v_ticket_exp,
               res.arrival_kind, res.arrival_place_id, res.arrival_reason, res.requested_place_honored);
    RETURN rv;
  END IF;

  -- Fresh (or PENDING re-) evaluation.
  SELECT * INTO c FROM world_visitor_continuity WHERE world_id = p_world_id AND subject_id = p_subject_id;
  IF FOUND AND c.visit_open THEN
    SELECT * INTO pr FROM world_visit_presence WHERE visit_id = c.open_visit_id AND closed_at IS NULL;
    IF NOT FOUND THEN
      -- An open visit with no runtime presence evidence (not opened by M14):
      -- nothing to reconnect to and nothing to infer.
      rv := ROW('UNAVAILABLE', 'RUNTIME_UNAVAILABLE', NULL, NULL, false, NULL, NULL, NULL, NULL, NULL);
    ELSE
      SELECT * INTO alloc FROM world_runtime_allocations WHERE allocation_id = pr.allocation_id;
      SELECT * INTO inst FROM world_runtime_instances WHERE instance_id = pr.instance_id;
      IF alloc.state = 'RELEASED' OR inst.status <> 'ACTIVE' OR inst.last_seen_at IS NULL
         OR inst.last_seen_at <= now() - make_interval(secs => pol.instance_liveness_seconds) THEN
        -- The runtime holding the visit is gone; the visit will time rv.
        rv := ROW('UNAVAILABLE', 'RUNTIME_UNAVAILABLE',
                   GREATEST(1, ceil(extract(epoch FROM (pr.last_presence_at + make_interval(secs => pol.presence_grace_seconds) - now())))::integer),
                   NULL, false, NULL, NULL, NULL, NULL, NULL);
      ELSE
        -- D7: reconnect within grace — same visit, same allocation, new ticket.
        SELECT * INTO orig FROM world_entry_resolutions WHERE visit_id = pr.visit_id AND reconnect = false ORDER BY resolved_at LIMIT 1;
        UPDATE world_entry_tickets SET superseded_at = now()
          WHERE allocation_id = alloc.allocation_id AND redeemed_at IS NULL AND superseded_at IS NULL;
        v_ticket_exp := now() + make_interval(secs => pol.ticket_ttl_seconds);
        INSERT INTO world_entry_tickets (ticket_sha256, intent_id, allocation_id, subject_id, world_id, visit_id, expires_at)
          VALUES (p_ticket_sha256, p_intent_id, alloc.allocation_id, p_subject_id, p_world_id, pr.visit_id, v_ticket_exp);
        rv := ROW('READY', NULL, NULL, pr.visit_id, true, v_ticket_exp,
                   COALESCE(orig.arrival_kind, p_arrival_kind), COALESCE(orig.arrival_place_id, alloc.arrival_place_id),
                   COALESCE(orig.arrival_reason, p_arrival_reason), COALESCE(orig.requested_place_honored, false));
      END IF;
    END IF;
  ELSE
    SELECT count(*) FILTER (WHERE i.readiness = 'READY'), count(*) FILTER (WHERE i.readiness = 'STARTING')
      INTO live_ready, live_starting
      FROM world_runtime_instances i
      WHERE i.world_id = p_world_id AND i.status = 'ACTIVE'
        AND i.last_seen_at > now() - make_interval(secs => pol.instance_liveness_seconds)
        AND EXISTS (SELECT 1 FROM world_runtime_credentials k WHERE k.instance_id = i.instance_id AND k.revoked_at IS NULL AND k.expires_at > now());
    SELECT i.* INTO inst
      FROM world_runtime_instances i
      WHERE i.world_id = p_world_id AND i.status = 'ACTIVE' AND i.readiness = 'READY'
        AND i.last_seen_at > now() - make_interval(secs => pol.instance_liveness_seconds)
        AND EXISTS (SELECT 1 FROM world_runtime_credentials k WHERE k.instance_id = i.instance_id AND k.revoked_at IS NULL AND k.expires_at > now())
        AND (SELECT count(*) FROM world_runtime_allocations a WHERE a.instance_id = i.instance_id AND a.state <> 'RELEASED') < i.capacity
      ORDER BY i.registered_at, i.instance_id
      LIMIT 1
      FOR UPDATE;
    IF FOUND THEN
      v_visit := gen_random_uuid();
      v_alloc := gen_random_uuid();
      v_ticket_exp := now() + make_interval(secs => pol.ticket_ttl_seconds);
      INSERT INTO world_runtime_allocations (allocation_id, instance_id, world_id, subject_id, visit_id, intent_id, arrival_place_id)
        VALUES (v_alloc, inst.instance_id, p_world_id, p_subject_id, v_visit, p_intent_id, p_arrival_place_id);
      INSERT INTO world_entry_tickets (ticket_sha256, intent_id, allocation_id, subject_id, world_id, visit_id, expires_at)
        VALUES (p_ticket_sha256, p_intent_id, v_alloc, p_subject_id, p_world_id, v_visit, v_ticket_exp);
      rv := ROW('READY', NULL, NULL, v_visit, false, v_ticket_exp, p_arrival_kind, p_arrival_place_id, p_arrival_reason, p_requested_place_honored);
    ELSIF live_ready > 0 THEN
      rv := ROW('UNAVAILABLE', 'AT_CAPACITY', 30, NULL, false, NULL, NULL, NULL, NULL, NULL);
    ELSIF live_starting > 0 THEN
      rv := ROW('PENDING', 'PREPARING', 5, NULL, false, NULL, NULL, NULL, NULL, NULL);
    ELSE
      rv := ROW('UNAVAILABLE', 'RUNTIME_UNAVAILABLE', 30, NULL, false, NULL, NULL, NULL, NULL, NULL);
    END IF;
  END IF;

  IF had_res THEN
    UPDATE world_entry_resolutions SET outcome = rv.outcome, reason = rv.reason, retry_after_seconds = rv.retry_after_seconds,
      visit_id = rv.visit_id, allocation_id = CASE WHEN rv.outcome = 'READY' THEN COALESCE(v_alloc, alloc.allocation_id) END,
      reconnect = COALESCE(rv.reconnect, false), arrival_kind = rv.arrival_kind, arrival_place_id = rv.arrival_place_id,
      arrival_reason = rv.arrival_reason, requested_place_honored = rv.requested_place_honored, updated_at = now()
      WHERE intent_id = p_intent_id;
  ELSE
    INSERT INTO world_entry_resolutions (intent_id, subject_id, world_id, outcome, reason, retry_after_seconds, visit_id, allocation_id,
      reconnect, requested_place_id, arrival_kind, arrival_place_id, arrival_reason, requested_place_honored, expires_at)
    VALUES (p_intent_id, p_subject_id, p_world_id, rv.outcome, rv.reason, rv.retry_after_seconds, rv.visit_id,
      CASE WHEN rv.outcome = 'READY' THEN COALESCE(v_alloc, alloc.allocation_id) END,
      COALESCE(rv.reconnect, false), p_requested_place_id, rv.arrival_kind, rv.arrival_place_id, rv.arrival_reason,
      rv.requested_place_honored, now() + make_interval(secs => pol.intent_lifetime_seconds));
  END IF;
  RETURN rv;
END;
$$;

-- ── 8. Handoff gateway (D5) ────────────────────────────────────────

CREATE OR REPLACE FUNCTION world_entry_redeem_ticket(p_ticket_sha256 bytea, p_view_sha256 bytea)
RETURNS TABLE (outcome text, session_id uuid, world_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE
  t world_entry_tickets;
  a world_runtime_allocations;
  inst world_runtime_instances;
  v_session uuid;
  v_reconnect boolean;
BEGIN
  PERFORM world_m14_assert_platform();
  IF p_view_sha256 IS NULL OR octet_length(p_view_sha256) <> 32 THEN
    RAISE EXCEPTION 'TICKET_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO t FROM world_entry_tickets WHERE ticket_sha256 = p_ticket_sha256;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'TICKET_INVALID' USING ERRCODE = '22023';
  END IF;
  PERFORM world_m14_lock(t.world_id, t.subject_id);
  SELECT * INTO t FROM world_entry_tickets WHERE ticket_sha256 = p_ticket_sha256 FOR UPDATE;
  IF t.redeemed_at IS NOT NULL THEN
    RAISE EXCEPTION 'TICKET_ALREADY_REDEEMED' USING ERRCODE = '55000';
  END IF;
  IF t.superseded_at IS NOT NULL THEN
    RAISE EXCEPTION 'TICKET_SUPERSEDED' USING ERRCODE = '55000';
  END IF;
  IF t.expires_at <= now() THEN
    RAISE EXCEPTION 'TICKET_EXPIRED' USING ERRCODE = '55000';
  END IF;
  PERFORM world_m14_timeout_if_expired(t.visit_id);
  SELECT * INTO a FROM world_runtime_allocations WHERE allocation_id = t.allocation_id FOR UPDATE;
  SELECT * INTO inst FROM world_runtime_instances WHERE instance_id = a.instance_id;
  IF a.state = 'RELEASED' OR inst.status <> 'ACTIVE' THEN
    -- Not an exception: a timeout recorded just above must commit.
    RETURN QUERY SELECT 'ALLOCATION_RELEASED'::text, NULL::uuid, t.world_id;
    RETURN;
  END IF;
  v_reconnect := EXISTS (SELECT 1 FROM world_visit_presence p WHERE p.visit_id = t.visit_id AND p.closed_at IS NULL);
  -- One live session per visit: a reconnect supersedes the previous one.
  UPDATE world_runtime_sessions s SET ended_at = now(), end_reason = 'SUPERSEDED'
    WHERE s.visit_id = t.visit_id AND s.ended_at IS NULL;
  v_session := gen_random_uuid();
  INSERT INTO world_runtime_sessions (session_id, allocation_id, instance_id, world_id, subject_id, visit_id, view_sha256, reconnect)
    VALUES (v_session, a.allocation_id, a.instance_id, t.world_id, t.subject_id, t.visit_id, p_view_sha256, v_reconnect);
  UPDATE world_entry_tickets SET redeemed_at = now(), session_id = v_session WHERE ticket_sha256 = p_ticket_sha256;
  RETURN QUERY SELECT 'REDEEMED'::text, v_session, t.world_id;
END;
$$;

-- Browser status: never returns runtime, allocation, visit or subject ids.
CREATE OR REPLACE FUNCTION world_entry_session_view(p_view_sha256 bytea)
RETURNS TABLE (state text, world_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE
  s world_runtime_sessions;
  pr world_visit_presence;
BEGIN
  PERFORM world_m14_assert_platform();
  SELECT * INTO s FROM world_runtime_sessions WHERE view_sha256 = p_view_sha256;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO pr FROM world_visit_presence WHERE visit_id = s.visit_id;
  RETURN QUERY SELECT
    CASE
      WHEN FOUND AND pr.closed_at IS NOT NULL THEN 'LEFT'
      WHEN s.ended_at IS NOT NULL THEN 'ENDED'
      WHEN s.leave_requested_at IS NOT NULL THEN 'LEAVING'
      WHEN s.joined_at IS NOT NULL THEN 'IN_WORLD'
      ELSE 'WAITING'
    END,
    s.world_id;
END;
$$;

-- A visitor's request to leave. It is an intent for the runtime, not a departure.
CREATE OR REPLACE FUNCTION world_entry_session_request_leave(p_view_sha256 bytea) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  s world_runtime_sessions;
BEGIN
  PERFORM world_m14_assert_platform();
  SELECT * INTO s FROM world_runtime_sessions WHERE view_sha256 = p_view_sha256 FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = '22023';
  END IF;
  IF s.ended_at IS NULL AND s.leave_requested_at IS NULL THEN
    UPDATE world_runtime_sessions SET leave_requested_at = now() WHERE session_id = s.session_id;
  END IF;
  RETURN 'LEAVE_REQUESTED';
END;
$$;

-- ── 9. Runtime ingress (D1, D2) ────────────────────────────────────

-- Liveness + work queue. p_readiness: STARTING | READY.
CREATE OR REPLACE FUNCTION world_runtime_poll(p_credential_id uuid, p_secret_sha256 bytea, p_readiness text) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inst world_runtime_instances;
  pol world_entry_policies;
  work jsonb;
BEGIN
  PERFORM world_m14_assert_platform();
  inst := world_m14_authenticate_runtime(p_credential_id, p_secret_sha256);
  IF p_readiness NOT IN ('STARTING', 'READY') THEN
    RAISE EXCEPTION 'INVALID_READINESS' USING ERRCODE = '22023';
  END IF;
  pol := world_m14_policy(inst.world_id);
  UPDATE world_runtime_instances SET readiness = p_readiness, last_seen_at = now() WHERE instance_id = inst.instance_id;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
      'sessionId', s.session_id, 'visitId', s.visit_id, 'subjectId', s.subject_id, 'worldId', s.world_id,
      'reconnect', s.reconnect, 'claimed', s.claimed_at IS NOT NULL, 'joined', s.joined_at IS NOT NULL,
      'leaveRequested', s.leave_requested_at IS NOT NULL) ORDER BY s.redeemed_at), '[]'::jsonb)
    INTO work
    FROM world_runtime_sessions s
    WHERE s.instance_id = inst.instance_id AND s.ended_at IS NULL;
  RETURN jsonb_build_object('heartbeatSeconds', pol.heartbeat_seconds, 'graceSeconds', pol.presence_grace_seconds, 'sessions', work);
END;
$$;

-- The runtime accepts a redeemed session and receives its visitor binding.
CREATE OR REPLACE FUNCTION world_runtime_claim(p_credential_id uuid, p_secret_sha256 bytea, p_session_id uuid) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inst world_runtime_instances;
  s world_runtime_sessions;
  a world_runtime_allocations;
BEGIN
  PERFORM world_m14_assert_platform();
  inst := world_m14_authenticate_runtime(p_credential_id, p_secret_sha256);
  s := world_m14_runtime_session(inst, p_session_id);
  IF s.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'SESSION_ENDED' USING ERRCODE = '55000';
  END IF;
  UPDATE world_runtime_sessions SET claimed_at = COALESCE(claimed_at, now()) WHERE session_id = s.session_id;
  SELECT * INTO a FROM world_runtime_allocations WHERE allocation_id = s.allocation_id;
  RETURN jsonb_build_object('sessionId', s.session_id, 'visitId', s.visit_id, 'subjectId', s.subject_id,
                            'worldId', s.world_id, 'placeId', a.arrival_place_id, 'reconnect', s.reconnect);
END;
$$;

-- ARRIVAL receipt: the visitor joined this runtime session. Opens the visit
-- (first join) or resumes it within grace (reconnect; no lifecycle event).
CREATE OR REPLACE FUNCTION world_runtime_arrival(p_credential_id uuid, p_secret_sha256 bytea, p_receipt_id uuid, p_session_id uuid, p_world_id text, p_world_tick integer) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inst world_runtime_instances;
  s world_runtime_sessions;
  a world_runtime_allocations;
  pr world_visit_presence;
  prior text;
  ev uuid;
  lr world_lifecycle_result;
  outcome text;
  digest text;
  has_pr boolean;
BEGIN
  PERFORM world_m14_assert_platform();
  inst := world_m14_authenticate_runtime(p_credential_id, p_secret_sha256);
  digest := md5('ARRIVAL:' || COALESCE(p_session_id::text, '') || ':' || COALESCE(p_world_id, ''));
  prior := world_m14_receipt_replay(p_receipt_id, 'ARRIVAL', p_credential_id, p_session_id, digest);
  IF prior IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'IDEMPOTENT_REPLAY', 'recorded', prior);
  END IF;
  s := world_m14_runtime_session(inst, p_session_id);
  IF p_world_id IS DISTINCT FROM s.world_id THEN
    RAISE EXCEPTION 'WORLD_MISMATCH' USING ERRCODE = '42501';
  END IF;
  PERFORM world_m14_lock(s.world_id, s.subject_id);
  SELECT * INTO s FROM world_runtime_sessions WHERE session_id = p_session_id FOR UPDATE;
  IF s.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'SESSION_ENDED' USING ERRCODE = '55000';
  END IF;
  IF s.claimed_at IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_CLAIMED' USING ERRCODE = '55000';
  END IF;
  SELECT * INTO a FROM world_runtime_allocations WHERE allocation_id = s.allocation_id FOR UPDATE;
  IF a.state = 'RELEASED' THEN
    RAISE EXCEPTION 'ALLOCATION_RELEASED' USING ERRCODE = '55000';
  END IF;
  PERFORM world_m14_timeout_if_expired(s.visit_id);
  SELECT * INTO pr FROM world_visit_presence WHERE visit_id = s.visit_id FOR UPDATE;
  has_pr := FOUND;

  IF has_pr AND pr.closed_at IS NOT NULL THEN
    -- Not an exception: a timeout recorded just above must commit.
    outcome := 'VISIT_CLOSED';
  ELSIF s.joined_at IS NOT NULL THEN
    outcome := 'ALREADY_JOINED';
  ELSIF has_pr THEN
    -- Reconnect within grace: new RuntimeSession, same visit, no second ARRIVAL.
    IF p_world_tick < pr.last_presence_tick THEN
      RAISE EXCEPTION 'TICK_REGRESSION' USING ERRCODE = '22023';
    END IF;
    UPDATE world_visit_presence SET last_presence_at = now(), last_presence_tick = p_world_tick WHERE visit_id = s.visit_id;
    UPDATE world_runtime_sessions SET joined_at = now() WHERE session_id = s.session_id;
    outcome := 'SESSION_RESUMED';
  ELSE
    ev := world_m14_event_id(s.visit_id, 'CONFIRMED_ARRIVAL');
    lr := world_m14_apply_arrival(
      ev, s.world_id, s.subject_id, s.visit_id, now(), p_world_tick, a.arrival_place_id,
      'RUNTIME_CONFIRMED', 'worldk-m14-runtime-ingress',
      jsonb_build_object('migration', '040', 'runtimeReceipt', true, 'receiptId', p_receipt_id, 'sessionId', s.session_id,
                         'allocationId', a.allocation_id, 'instanceId', inst.instance_id, 'credentialId', p_credential_id));
    INSERT INTO world_visit_presence (visit_id, world_id, subject_id, allocation_id, instance_id, opened_at, last_presence_at, last_presence_tick)
      VALUES (s.visit_id, s.world_id, s.subject_id, a.allocation_id, inst.instance_id, now(), now(), p_world_tick);
    UPDATE world_runtime_allocations SET state = 'ACTIVE' WHERE allocation_id = a.allocation_id;
    UPDATE world_runtime_sessions SET joined_at = now() WHERE session_id = s.session_id;
    outcome := 'VISIT_OPENED';
  END IF;
  UPDATE world_runtime_instances SET last_seen_at = now() WHERE instance_id = inst.instance_id;
  INSERT INTO world_runtime_receipts (receipt_id, kind, credential_id, instance_id, session_id, payload_digest, outcome)
    VALUES (p_receipt_id, 'ARRIVAL', p_credential_id, inst.instance_id, p_session_id, digest, outcome);
  RETURN jsonb_build_object('outcome', outcome);
END;
$$;

-- PRESENCE receipt (heartbeat) for a joined session.
CREATE OR REPLACE FUNCTION world_runtime_presence(p_credential_id uuid, p_secret_sha256 bytea, p_receipt_id uuid, p_session_id uuid, p_world_id text, p_world_tick integer) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inst world_runtime_instances;
  s world_runtime_sessions;
  pr world_visit_presence;
  prior text;
  outcome text;
  digest text;
BEGIN
  PERFORM world_m14_assert_platform();
  inst := world_m14_authenticate_runtime(p_credential_id, p_secret_sha256);
  digest := md5('PRESENCE:' || COALESCE(p_session_id::text, '') || ':' || COALESCE(p_world_id, ''));
  prior := world_m14_receipt_replay(p_receipt_id, 'PRESENCE', p_credential_id, p_session_id, digest);
  IF prior IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'IDEMPOTENT_REPLAY', 'recorded', prior);
  END IF;
  s := world_m14_runtime_session(inst, p_session_id);
  IF p_world_id IS DISTINCT FROM s.world_id THEN
    RAISE EXCEPTION 'WORLD_MISMATCH' USING ERRCODE = '42501';
  END IF;
  PERFORM world_m14_lock(s.world_id, s.subject_id);
  SELECT * INTO s FROM world_runtime_sessions WHERE session_id = p_session_id FOR UPDATE;
  IF s.joined_at IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_JOINED' USING ERRCODE = '55000';
  END IF;
  IF world_m14_timeout_if_expired(s.visit_id) THEN
    outcome := 'VISIT_TIMED_OUT';
  ELSE
    SELECT * INTO pr FROM world_visit_presence WHERE visit_id = s.visit_id FOR UPDATE;
    IF NOT FOUND OR pr.closed_at IS NOT NULL THEN
      RAISE EXCEPTION 'VISIT_CLOSED' USING ERRCODE = '55000';
    END IF;
    IF s.ended_at IS NOT NULL THEN
      RAISE EXCEPTION 'SESSION_ENDED' USING ERRCODE = '55000';
    END IF;
    IF p_world_tick < pr.last_presence_tick THEN
      RAISE EXCEPTION 'TICK_REGRESSION' USING ERRCODE = '22023';
    END IF;
    UPDATE world_visit_presence SET last_presence_at = now(), last_presence_tick = p_world_tick WHERE visit_id = s.visit_id;
    outcome := 'PRESENCE_RECORDED';
  END IF;
  UPDATE world_runtime_instances SET last_seen_at = now() WHERE instance_id = inst.instance_id;
  INSERT INTO world_runtime_receipts (receipt_id, kind, credential_id, instance_id, session_id, payload_digest, outcome)
    VALUES (p_receipt_id, 'PRESENCE', p_credential_id, inst.instance_id, p_session_id, digest, outcome);
  RETURN jsonb_build_object('outcome', outcome, 'leaveRequested', s.leave_requested_at IS NOT NULL);
END;
$$;

-- DEPARTURE receipt: the visitor left this runtime session (explicit).
CREATE OR REPLACE FUNCTION world_runtime_departure(p_credential_id uuid, p_secret_sha256 bytea, p_receipt_id uuid, p_session_id uuid, p_world_id text, p_world_tick integer) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inst world_runtime_instances;
  s world_runtime_sessions;
  pr world_visit_presence;
  prior text;
  outcome text;
  ev uuid;
  lr world_lifecycle_result;
  digest text;
BEGIN
  PERFORM world_m14_assert_platform();
  inst := world_m14_authenticate_runtime(p_credential_id, p_secret_sha256);
  digest := md5('DEPARTURE:' || COALESCE(p_session_id::text, '') || ':' || COALESCE(p_world_id, ''));
  prior := world_m14_receipt_replay(p_receipt_id, 'DEPARTURE', p_credential_id, p_session_id, digest);
  IF prior IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'IDEMPOTENT_REPLAY', 'recorded', prior);
  END IF;
  s := world_m14_runtime_session(inst, p_session_id);
  IF p_world_id IS DISTINCT FROM s.world_id THEN
    RAISE EXCEPTION 'WORLD_MISMATCH' USING ERRCODE = '42501';
  END IF;
  PERFORM world_m14_lock(s.world_id, s.subject_id);
  SELECT * INTO s FROM world_runtime_sessions WHERE session_id = p_session_id FOR UPDATE;
  IF s.joined_at IS NULL THEN
    RAISE EXCEPTION 'SESSION_NOT_JOINED' USING ERRCODE = '55000';
  END IF;
  SELECT * INTO pr FROM world_visit_presence WHERE visit_id = s.visit_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'NO_OPEN_VISIT' USING ERRCODE = '55000';
  END IF;
  IF pr.closed_at IS NOT NULL THEN
    -- Already terminal (e.g. PRESENCE_TIMEOUT won): report it, record nothing new.
    outcome := 'ALREADY_CLOSED_' || pr.close_kind;
  ELSIF world_m14_timeout_if_expired(s.visit_id) THEN
    -- Evidence arrived after the grace window: the visit ended at its last
    -- accepted presence, not now.
    outcome := 'VISIT_TIMED_OUT';
  ELSIF s.ended_at IS NOT NULL THEN
    RAISE EXCEPTION 'SESSION_ENDED' USING ERRCODE = '55000';
  ELSE
    IF p_world_tick < pr.last_presence_tick THEN
      RAISE EXCEPTION 'TICK_REGRESSION' USING ERRCODE = '22023';
    END IF;
    ev := world_m14_event_id(s.visit_id, 'CONFIRMED_DEPARTURE');
    lr := world_m14_apply_departure(
      ev, s.world_id, s.subject_id, s.visit_id, now(), p_world_tick, NULL,
      'RUNTIME_CONFIRMED', 'worldk-m14-runtime-ingress',
      jsonb_build_object('migration', '040', 'runtimeReceipt', true, 'receiptId', p_receipt_id, 'sessionId', s.session_id,
                         'allocationId', s.allocation_id, 'instanceId', inst.instance_id, 'credentialId', p_credential_id),
      'LEAVE_RECORDED');
    UPDATE world_visit_presence SET last_presence_at = now(), last_presence_tick = p_world_tick WHERE visit_id = s.visit_id;
    SELECT * INTO pr FROM world_visit_presence WHERE visit_id = s.visit_id;
    PERFORM world_m14_close_visit(pr, 'RUNTIME_DEPARTURE', ev, 'RUNTIME_DEPARTURE');
    outcome := 'VISIT_CLOSED';
  END IF;
  UPDATE world_runtime_instances SET last_seen_at = now() WHERE instance_id = inst.instance_id;
  INSERT INTO world_runtime_receipts (receipt_id, kind, credential_id, instance_id, session_id, payload_digest, outcome)
    VALUES (p_receipt_id, 'DEPARTURE', p_credential_id, inst.instance_id, p_session_id, digest, outcome);
  RETURN jsonb_build_object('outcome', outcome);
END;
$$;

-- DISCONNECT receipt: the renderer/stream dropped. Not a departure: the
-- session ends, the visit stays open, and the grace window keeps running
-- from the last accepted presence.
CREATE OR REPLACE FUNCTION world_runtime_disconnect(p_credential_id uuid, p_secret_sha256 bytea, p_receipt_id uuid, p_session_id uuid, p_world_id text) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inst world_runtime_instances;
  s world_runtime_sessions;
  pr world_visit_presence;
  pol world_entry_policies;
  prior text;
  digest text;
BEGIN
  PERFORM world_m14_assert_platform();
  inst := world_m14_authenticate_runtime(p_credential_id, p_secret_sha256);
  digest := md5('DISCONNECT:' || COALESCE(p_session_id::text, '') || ':' || COALESCE(p_world_id, ''));
  prior := world_m14_receipt_replay(p_receipt_id, 'DISCONNECT', p_credential_id, p_session_id, digest);
  IF prior IS NOT NULL THEN
    RETURN jsonb_build_object('outcome', 'IDEMPOTENT_REPLAY', 'recorded', prior);
  END IF;
  s := world_m14_runtime_session(inst, p_session_id);
  IF p_world_id IS DISTINCT FROM s.world_id THEN
    RAISE EXCEPTION 'WORLD_MISMATCH' USING ERRCODE = '42501';
  END IF;
  PERFORM world_m14_lock(s.world_id, s.subject_id);
  UPDATE world_runtime_sessions SET ended_at = now(), end_reason = 'DISCONNECTED' WHERE session_id = s.session_id AND ended_at IS NULL;
  pol := world_m14_policy(s.world_id);
  SELECT * INTO pr FROM world_visit_presence WHERE visit_id = s.visit_id;
  UPDATE world_runtime_instances SET last_seen_at = now() WHERE instance_id = inst.instance_id;
  INSERT INTO world_runtime_receipts (receipt_id, kind, credential_id, instance_id, session_id, payload_digest, outcome)
    VALUES (p_receipt_id, 'DISCONNECT', p_credential_id, inst.instance_id, p_session_id, digest, 'GRACE_RUNNING');
  RETURN jsonb_build_object('outcome', 'GRACE_RUNNING',
    'graceEndsAt', CASE WHEN pr.visit_id IS NOT NULL AND pr.closed_at IS NULL THEN pr.last_presence_at + make_interval(secs => pol.presence_grace_seconds) END);
END;
$$;

-- ── 10. Presence sweeper (D3) ──────────────────────────────────────

CREATE OR REPLACE FUNCTION world_presence_sweep(p_limit integer) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  cand record;
  n integer := 0;
BEGIN
  PERFORM world_m14_assert_platform();
  FOR cand IN
    SELECT p.visit_id, p.world_id, p.subject_id
    FROM world_visit_presence p
    JOIN world_entry_policies pol ON pol.world_id = p.world_id
    WHERE p.closed_at IS NULL AND p.last_presence_at + make_interval(secs => pol.presence_grace_seconds) < now()
    ORDER BY p.last_presence_at, p.visit_id
    LIMIT LEAST(GREATEST(COALESCE(p_limit, 50), 1), 500)
  LOOP
    PERFORM world_m14_lock(cand.world_id, cand.subject_id);
    IF world_m14_timeout_if_expired(cand.visit_id) THEN
      n := n + 1;
    END IF;
  END LOOP;
  FOR cand IN SELECT world_id FROM world_entry_policies LOOP
    PERFORM world_m14_release_abandoned(cand.world_id);
  END LOOP;
  RETURN n;
END;
$$;

-- ── 11. Runtime registry (owner-only; operator-run) ────────────────

CREATE OR REPLACE FUNCTION world_runtime_register_instance(p_instance_id uuid, p_world_id text, p_label text, p_capacity integer) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  PERFORM world_m14_policy(p_world_id);
  INSERT INTO world_runtime_instances (instance_id, world_id, authority_id, label, capacity)
    VALUES (p_instance_id, p_world_id, 'worldk-m14-runtime-ingress', p_label, p_capacity);
  RETURN p_instance_id;
END;
$$;

-- Only the sha256 of the secret is supplied; the plaintext never reaches the DB.
CREATE OR REPLACE FUNCTION world_runtime_issue_credential(p_credential_id uuid, p_instance_id uuid, p_secret_sha256 bytea, p_ttl_seconds integer) RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  inst world_runtime_instances;
  pol world_entry_policies;
  exp timestamptz;
BEGIN
  SELECT * INTO inst FROM world_runtime_instances WHERE instance_id = p_instance_id;
  IF NOT FOUND OR inst.status <> 'ACTIVE' THEN
    RAISE EXCEPTION 'RUNTIME_INSTANCE_REVOKED' USING ERRCODE = '28000';
  END IF;
  pol := world_m14_policy(inst.world_id);
  IF p_ttl_seconds IS NULL OR p_ttl_seconds < 60 OR p_ttl_seconds > pol.credential_max_ttl_seconds THEN
    RAISE EXCEPTION 'CREDENTIAL_TTL_INVALID' USING ERRCODE = '22023';
  END IF;
  exp := now() + make_interval(secs => p_ttl_seconds);
  INSERT INTO world_runtime_credentials (credential_id, instance_id, secret_sha256, expires_at)
    VALUES (p_credential_id, p_instance_id, p_secret_sha256, exp);
  RETURN exp;
END;
$$;

CREATE OR REPLACE FUNCTION world_runtime_revoke_credential(p_credential_id uuid) RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
  UPDATE world_runtime_credentials SET revoked_at = now() WHERE credential_id = p_credential_id AND revoked_at IS NULL;
$$;

-- Revoking an instance revokes its credentials. Open visits are NOT closed
-- here: with no further presence evidence they reach PRESENCE_TIMEOUT.
CREATE OR REPLACE FUNCTION world_runtime_revoke_instance(p_instance_id uuid) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  UPDATE world_runtime_instances SET status = 'REVOKED', revoked_at = now(), readiness = 'OFFLINE' WHERE instance_id = p_instance_id AND status = 'ACTIVE';
  UPDATE world_runtime_credentials SET revoked_at = now() WHERE instance_id = p_instance_id AND revoked_at IS NULL;
  UPDATE world_runtime_allocations a SET state = 'RELEASED', released_at = now(), release_reason = 'INSTANCE_REVOKED'
    WHERE a.instance_id = p_instance_id AND a.state = 'ALLOCATED';
END;
$$;

-- ── 12. Privileges ─────────────────────────────────────────────────

REVOKE ALL ON TABLE world_entry_policies, world_runtime_instances, world_runtime_credentials, world_entry_resolutions,
  world_runtime_allocations, world_entry_tickets, world_runtime_sessions, world_visit_presence, world_runtime_receipts
  FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION world_m14_assert_platform() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_policy(text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_lock(text, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_event_id(uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_authenticate_runtime(uuid, bytea) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_receipt_replay(uuid, text, uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_runtime_session(world_runtime_instances, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_apply_arrival(uuid, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_apply_departure(uuid, text, uuid, uuid, timestamptz, integer, text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_close_visit(world_visit_presence, text, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_timeout_if_expired(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14_release_abandoned(text) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION world_entry_resolve(uuid, uuid, text, text, text, text, text, boolean, bytea) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_entry_redeem_ticket(bytea, bytea) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_entry_session_view(bytea) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_entry_session_request_leave(bytea) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_poll(uuid, bytea, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_claim(uuid, bytea, uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_arrival(uuid, bytea, uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_presence(uuid, bytea, uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_departure(uuid, bytea, uuid, uuid, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_disconnect(uuid, bytea, uuid, uuid, text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_presence_sweep(integer) FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION world_runtime_register_instance(uuid, text, text, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_issue_credential(uuid, uuid, bytea, integer) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_revoke_credential(uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_runtime_revoke_instance(uuid) FROM PUBLIC, anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_entry_resolve(uuid, uuid, text, text, text, text, text, boolean, bytea) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_entry_redeem_ticket(bytea, bytea) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_entry_session_view(bytea) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_entry_session_request_leave(bytea) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_runtime_poll(uuid, bytea, text) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_runtime_claim(uuid, bytea, uuid) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_runtime_arrival(uuid, bytea, uuid, uuid, text, integer) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_runtime_presence(uuid, bytea, uuid, uuid, text, integer) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_runtime_departure(uuid, bytea, uuid, uuid, text, integer) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_runtime_disconnect(uuid, bytea, uuid, uuid, text) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_presence_sweep(integer) TO worldk_platform_entry_authority;
