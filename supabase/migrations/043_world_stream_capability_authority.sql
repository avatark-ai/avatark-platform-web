-- AvatarK Platform — WORLDK-M14-B3: stream connection capability authority.
--
-- PREVIEW-CERTIFICATION ONLY. For avatark-platform-preview
-- (gxjdbfpyyrycvqzozyty) ONLY. The migration runner refuses to apply this file
-- to any other project.
--
-- Forward-only and additive over 040. No earlier object is altered: one new
-- table, two Platform-gated SECURITY DEFINER functions and one internal
-- read-only predicate. Nothing here writes a lifecycle, presence, session,
-- allocation, continuity or world-state row.
--
--   AUTHORITATIVE IN_WORLD RuntimeSession
--     -> world_stream_capability_issue     short-lived (60 s) capability, hash stored
--     -> world_stream_capability_redeem    single use, atomic, fail closed
--     -> opaque AUTHORIZED result          (hash of an opaque authorization stored)
--
-- What a stream capability is NOT (owner decision 11): world-entry,
-- runtime-arrival, presence, continuity, lifecycle, world-state or renderer
-- authority. It authorizes only the initial request to establish a future
-- stream connection for an already-authoritative RuntimeSession. The
-- physical signalling/renderer topology remains UNFROZEN (B0); nothing in
-- this file names a renderer, signalling host, TURN server or GPU.
--
-- Authenticated subject: on the Platform gateway origin the browser is
-- authenticated by its RuntimeSession's status-page capability (040
-- view_sha256, an HttpOnly cookie minted at ticket redemption). The session
-- row supplies session, subject and world; no caller ever names a subject.
--
-- IN_WORLD here is stricter than the status page's display state and is
-- evaluated READ-ONLY (it never calls world_m14_timeout_if_expired, which
-- would make this path a lifecycle writer):
--   session not ended, no leave requested, joined (runtime ARRIVAL accepted);
--   the visit's presence row open AND within the world's presence grace;
--   039 continuity open for exactly this visit;
--   allocation not released; runtime instance ACTIVE.
--
-- Privileges: Supabase default privileges grant anon/authenticated/
-- service_role ALL on new public tables and EXECUTE on new public functions
-- (the 038 lesson), so every grant is revoked explicitly below. Only
-- worldk_platform_entry_authority (the Platform credential's SET-only role)
-- may EXECUTE the two entry points; nobody holds table privileges.

-- ── 1. Capability store (hash only) ───────────────────────────────

CREATE TABLE IF NOT EXISTS world_stream_capabilities (
  capability_sha256 bytea PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES world_runtime_sessions (session_id),
  subject_id uuid NOT NULL,
  world_id text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  consumed_at timestamptz,
  -- sha256 of the opaque authorization returned on the one successful
  -- redemption. Inert in B3: no function accepts it yet.
  authorization_sha256 bytea UNIQUE,
  CONSTRAINT world_stream_capabilities_hash CHECK (octet_length(capability_sha256) = 32),
  CONSTRAINT world_stream_capabilities_authorization_hash CHECK (authorization_sha256 IS NULL OR octet_length(authorization_sha256) = 32),
  CONSTRAINT world_stream_capabilities_ttl CHECK (expires_at = issued_at + interval '60 seconds'),
  CONSTRAINT world_stream_capabilities_consumed CHECK ((consumed_at IS NULL) = (authorization_sha256 IS NULL)),
  CONSTRAINT world_stream_capabilities_consumed_in_window CHECK (consumed_at IS NULL OR (consumed_at >= issued_at AND consumed_at < expires_at))
);

CREATE INDEX IF NOT EXISTS world_stream_capabilities_session_idx ON world_stream_capabilities (session_id, expires_at);

ALTER TABLE world_stream_capabilities ENABLE ROW LEVEL SECURITY;
-- No policies: RLS denies every API role even if a grant were ever re-added.

-- ── 2. Internal read-only predicate (EXECUTE revoked from everyone) ──

CREATE OR REPLACE FUNCTION world_m14b3_session_in_world(p_session world_runtime_sessions) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  pol world_entry_policies;
BEGIN
  IF p_session.ended_at IS NOT NULL OR p_session.leave_requested_at IS NOT NULL OR p_session.joined_at IS NULL THEN
    RETURN false;
  END IF;
  SELECT * INTO pol FROM world_entry_policies WHERE world_id = p_session.world_id;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM world_visit_presence pr
    JOIN world_visitor_continuity c ON c.world_id = pr.world_id AND c.subject_id = pr.subject_id
    JOIN world_runtime_allocations a ON a.allocation_id = p_session.allocation_id
    JOIN world_runtime_instances i ON i.instance_id = p_session.instance_id
    WHERE pr.visit_id = p_session.visit_id
      AND pr.subject_id = p_session.subject_id
      AND pr.world_id = p_session.world_id
      AND pr.closed_at IS NULL
      AND now() <= pr.last_presence_at + make_interval(secs => pol.presence_grace_seconds)
      AND c.visit_open
      AND c.open_visit_id = p_session.visit_id
      AND a.state <> 'RELEASED'
      AND a.visit_id = p_session.visit_id
      AND i.status = 'ACTIVE'
  );
END;
$$;

-- ── 3. Issuance (Platform gateway only) ───────────────────────────

CREATE OR REPLACE FUNCTION world_stream_capability_issue(p_view_sha256 bytea, p_capability_sha256 bytea)
RETURNS TABLE (outcome text, world_id text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE
  s world_runtime_sessions;
  v_expires timestamptz;
BEGIN
  PERFORM world_m14_assert_platform();
  IF p_view_sha256 IS NULL OR octet_length(p_view_sha256) <> 32 THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = '22023';
  END IF;
  IF p_capability_sha256 IS NULL OR octet_length(p_capability_sha256) <> 32 THEN
    RAISE EXCEPTION 'STREAM_CAPABILITY_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO s FROM world_runtime_sessions WHERE view_sha256 = p_view_sha256;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SESSION_NOT_FOUND' USING ERRCODE = '22023';
  END IF;
  -- Serialise with every lifecycle writer for this (world, subject).
  PERFORM world_m14_lock(s.world_id, s.subject_id);
  SELECT * INTO s FROM world_runtime_sessions WHERE session_id = s.session_id;
  IF NOT world_m14b3_session_in_world(s) THEN
    RAISE EXCEPTION 'STREAM_SESSION_NOT_IN_WORLD' USING ERRCODE = '55000';
  END IF;
  -- Bound outstanding (unconsumed, unexpired) capabilities per session.
  IF (SELECT count(*) FROM world_stream_capabilities k
       WHERE k.session_id = s.session_id AND k.consumed_at IS NULL AND k.expires_at > now()) >= 5 THEN
    RAISE EXCEPTION 'STREAM_CAPABILITY_LIMIT' USING ERRCODE = '55000';
  END IF;
  v_expires := now() + interval '60 seconds';
  INSERT INTO world_stream_capabilities (capability_sha256, session_id, subject_id, world_id, issued_at, expires_at)
    VALUES (p_capability_sha256, s.session_id, s.subject_id, s.world_id, now(), v_expires);
  RETURN QUERY SELECT 'ISSUED'::text, s.world_id, v_expires;
END;
$$;

-- ── 4. Redemption (stub signalling authorization; single use) ─────
--
-- The redeeming browser presents the capability AND its own gateway session
-- capability; both must resolve to the same RuntimeSession, subject and
-- world, and that session must still be IN_WORLD. Every refusal raises, so
-- the transaction rolls back and a refused attempt writes nothing (it
-- neither consumes nor burns the capability). Concurrent redemptions
-- serialise on the capability row lock: exactly one sees consumed_at NULL.

CREATE OR REPLACE FUNCTION world_stream_capability_redeem(p_capability_sha256 bytea, p_view_sha256 bytea, p_world_id text, p_authorization_sha256 bytea)
RETURNS TABLE (outcome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
#variable_conflict use_column
DECLARE
  k world_stream_capabilities;
  s world_runtime_sessions;
BEGIN
  PERFORM world_m14_assert_platform();
  IF p_capability_sha256 IS NULL OR octet_length(p_capability_sha256) <> 32
     OR p_authorization_sha256 IS NULL OR octet_length(p_authorization_sha256) <> 32 THEN
    RAISE EXCEPTION 'STREAM_CAPABILITY_INVALID' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO k FROM world_stream_capabilities WHERE capability_sha256 = p_capability_sha256;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'STREAM_CAPABILITY_INVALID' USING ERRCODE = '22023';
  END IF;
  PERFORM world_m14_lock(k.world_id, k.subject_id);
  SELECT * INTO k FROM world_stream_capabilities WHERE capability_sha256 = p_capability_sha256 FOR UPDATE;
  IF k.consumed_at IS NOT NULL THEN
    RAISE EXCEPTION 'STREAM_CAPABILITY_CONSUMED' USING ERRCODE = '55000';
  END IF;
  IF k.expires_at <= now() THEN
    RAISE EXCEPTION 'STREAM_CAPABILITY_EXPIRED' USING ERRCODE = '55000';
  END IF;
  IF p_view_sha256 IS NULL OR octet_length(p_view_sha256) <> 32 THEN
    RAISE EXCEPTION 'STREAM_CAPABILITY_BINDING_MISMATCH' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO s FROM world_runtime_sessions WHERE view_sha256 = p_view_sha256;
  IF NOT FOUND
     OR s.session_id <> k.session_id
     OR s.subject_id <> k.subject_id
     OR s.world_id <> k.world_id
     OR p_world_id IS DISTINCT FROM k.world_id THEN
    RAISE EXCEPTION 'STREAM_CAPABILITY_BINDING_MISMATCH' USING ERRCODE = '42501';
  END IF;
  IF NOT world_m14b3_session_in_world(s) THEN
    RAISE EXCEPTION 'STREAM_SESSION_NOT_IN_WORLD' USING ERRCODE = '55000';
  END IF;
  UPDATE world_stream_capabilities SET consumed_at = now(), authorization_sha256 = p_authorization_sha256
    WHERE capability_sha256 = p_capability_sha256 AND consumed_at IS NULL;
  RETURN QUERY SELECT 'AUTHORIZED'::text;
END;
$$;

COMMENT ON TABLE world_stream_capabilities IS
  'WORLDK-M14-B3: single-use 60 s stream connection capabilities (sha256 only). Authorizes only the initial stream connection request for an IN_WORLD RuntimeSession; not lifecycle/presence/continuity/world-state/renderer authority.';

-- ── 5. Privileges ─────────────────────────────────────────────────

REVOKE ALL ON TABLE world_stream_capabilities FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_m14b3_session_in_world(world_runtime_sessions) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_stream_capability_issue(bytea, bytea) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION world_stream_capability_redeem(bytea, bytea, text, bytea) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION world_stream_capability_issue(bytea, bytea) TO worldk_platform_entry_authority;
GRANT EXECUTE ON FUNCTION world_stream_capability_redeem(bytea, bytea, text, bytea) TO worldk_platform_entry_authority;
